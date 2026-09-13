"""
Evidence file storage.

Two backends behind one interface. Local filesystem is the default so evidence
upload works on a laptop with nothing else running; MinIO/S3 is used when
`STORAGE_BACKEND=minio` and credentials are present, which is what a real
deployment uses.

Safety rules applied to every upload, regardless of backend:

  * The declared content type must be on the allow-list. A factory uploads
    bills and photographs; it does not upload executables.
  * The stored name is generated, never the client's filename. A filename is
    attacker-controlled input and is the usual way a path traversal arrives.
  * Size is enforced while streaming, not from the Content-Length header a
    client can lie about.
"""
from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from typing import BinaryIO

from app.core.config import settings
from app.core.errors import BadRequest, PayloadTooLarge

ALLOWED_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/heic": ".heic",
    "image/webp": ".webp",
    "text/csv": ".csv",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}

_CHUNK = 1024 * 256
_SAFE_SEGMENT = re.compile(r"[^A-Za-z0-9._-]")


@dataclass
class StoredFile:
    storage_key: str
    storage_backend: str
    size_bytes: int
    content_sha256: str
    content_type: str


def _validate_type(content_type: str) -> str:
    normalised = (content_type or "").split(";")[0].strip().lower()
    if normalised not in ALLOWED_CONTENT_TYPES:
        raise BadRequest(
            f"Files of type '{content_type or 'unknown'}' are not accepted. "
            f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}.",
            "unsupported_file_type",
        )
    return normalised


def store(stream: BinaryIO, *, content_type: str, organization_id: str,
          document_id: str) -> StoredFile:
    """Persist an uploaded stream and return where it went."""
    normalised = _validate_type(content_type)
    extension = ALLOWED_CONTENT_TYPES[normalised]
    org_segment = _SAFE_SEGMENT.sub("_", organization_id)[:48]
    doc_segment = _SAFE_SEGMENT.sub("_", document_id)[:48]
    key = f"{org_segment}/{doc_segment}{extension}"

    limit = settings.max_upload_mb * 1024 * 1024
    digest = hashlib.sha256()
    size = 0

    if settings.storage_backend == "minio":
        return _store_minio(stream, key, normalised, limit, digest)
    elif settings.storage_backend in ("firestore", "firebase"):
        return _store_firestore(stream, key, normalised, limit, digest)
    elif settings.storage_backend in ("gcs", "google"):
        return _store_gcs(stream, key, normalised, limit, digest)

    path = os.path.join(settings.storage_local_dir, key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as out:
        while True:
            chunk = stream.read(_CHUNK)
            if not chunk:
                break
            size += len(chunk)
            if size > limit:
                out.close()
                os.remove(path)
                raise PayloadTooLarge(
                    f"File is larger than the {settings.max_upload_mb} MB limit."
                )
            digest.update(chunk)
            out.write(chunk)

    return StoredFile(
        storage_key=key, storage_backend="local", size_bytes=size,
        content_sha256=digest.hexdigest(), content_type=normalised,
    )


def _store_firestore(stream: BinaryIO, key: str, content_type: str, limit: int,
                     digest) -> StoredFile:
    import base64
    from app.core.firestore_db import get_firestore_client
    client = get_firestore_client()
    if not client:
        raise BadRequest("STORAGE_BACKEND is 'firestore' but Firestore is not connected.", "storage_misconfigured")

    buffer = bytearray()
    while True:
        chunk = stream.read(_CHUNK)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > limit:
            raise PayloadTooLarge(f"File is larger than the {settings.max_upload_mb} MB limit.")
        digest.update(chunk)

    safe_doc_id = key.replace("/", "___")
    client.collection("evidence_blobs").document(safe_doc_id).set({
        "storage_key": key,
        "content_type": content_type,
        "size_bytes": len(buffer),
        "content_sha256": digest.hexdigest(),
        "data_b64": base64.b64encode(bytes(buffer)).decode("ascii"),
    })
    return StoredFile(
        storage_key=key, storage_backend="firestore", size_bytes=len(buffer),
        content_sha256=digest.hexdigest(), content_type=content_type,
    )


def _store_gcs(stream: BinaryIO, key: str, content_type: str, limit: int,
               digest) -> StoredFile:
    try:
        from google.cloud import storage
    except ImportError as ex:
        raise BadRequest("STORAGE_BACKEND is 'gcs' but google-cloud-storage is not installed.", "storage_misconfigured") from ex

    bucket_name = os.environ.get("GCS_BUCKET") or os.environ.get("STORAGE_BUCKET") or f"{settings.firestore_project_id}.appspot.com"
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    buffer = bytearray()
    while True:
        chunk = stream.read(_CHUNK)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > limit:
            raise PayloadTooLarge(f"File is larger than the {settings.max_upload_mb} MB limit.")
        digest.update(chunk)

    blob = bucket.blob(key)
    blob.upload_from_string(bytes(buffer), content_type=content_type)
    return StoredFile(
        storage_key=key, storage_backend="gcs", size_bytes=len(buffer),
        content_sha256=digest.hexdigest(), content_type=content_type,
    )


def _store_minio(stream: BinaryIO, key: str, content_type: str, limit: int,
                 digest) -> StoredFile:  # pragma: no cover - needs a running MinIO
    try:
        from minio import Minio
    except ImportError as ex:
        raise BadRequest(
            "STORAGE_BACKEND is 'minio' but the minio package is not installed.",
            "storage_misconfigured",
        ) from ex

    client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)

    # Buffer to measure and hash before the put, so an oversized upload is
    # rejected rather than stored and then deleted.
    buffer = bytearray()
    while True:
        chunk = stream.read(_CHUNK)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > limit:
            raise PayloadTooLarge(f"File is larger than the {settings.max_upload_mb} MB limit.")
        digest.update(chunk)

    import io

    client.put_object(
        settings.minio_bucket, key, io.BytesIO(bytes(buffer)), length=len(buffer),
        content_type=content_type,
    )
    return StoredFile(
        storage_key=key, storage_backend="minio", size_bytes=len(buffer),
        content_sha256=digest.hexdigest(), content_type=content_type,
    )


def open_stream(storage_key: str, backend: str) -> BinaryIO:
    """Open a stored file for download. Raises FileNotFoundError if gone."""
    if backend in ("firestore", "firebase"):
        import base64
        import io
        from app.core.firestore_db import get_firestore_client
        client = get_firestore_client()
        if not client:
            raise FileNotFoundError(storage_key)
        safe_doc_id = storage_key.replace("/", "___")
        doc = client.collection("evidence_blobs").document(safe_doc_id).get()
        if not doc.exists:
            raise FileNotFoundError(storage_key)
        raw = base64.b64decode((doc.to_dict() or {}).get("data_b64", ""))
        return io.BytesIO(raw)

    if backend in ("gcs", "google"):
        import io
        from google.cloud import storage
        bucket_name = os.environ.get("GCS_BUCKET") or os.environ.get("STORAGE_BUCKET") or f"{settings.firestore_project_id}.appspot.com"
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(storage_key)
        if not blob.exists():
            raise FileNotFoundError(storage_key)
        return io.BytesIO(blob.download_as_bytes())

    if backend == "minio":  # pragma: no cover - needs a running MinIO
        from minio import Minio

        client = Minio(
            settings.minio_endpoint, access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key, secure=settings.minio_secure,
        )
        return client.get_object(settings.minio_bucket, storage_key)

    path = os.path.join(settings.storage_local_dir, storage_key)
    # The key is generated by `store`, but a stored row could still be tampered
    # with; confirm the resolved path stays inside the storage root.
    root = os.path.abspath(settings.storage_local_dir)
    if not os.path.abspath(path).startswith(root + os.sep):
        raise FileNotFoundError(storage_key)
    return open(path, "rb")


def delete(storage_key: str, backend: str) -> None:
    if backend in ("firestore", "firebase"):
        from app.core.firestore_db import get_firestore_client
        client = get_firestore_client()
        if client:
            safe_doc_id = storage_key.replace("/", "___")
            client.collection("evidence_blobs").document(safe_doc_id).delete()
        return

    if backend in ("gcs", "google"):
        from google.cloud import storage
        bucket_name = os.environ.get("GCS_BUCKET") or os.environ.get("STORAGE_BUCKET") or f"{settings.firestore_project_id}.appspot.com"
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(storage_key)
        if blob.exists():
            blob.delete()
        return

    if backend == "minio":  # pragma: no cover
        from minio import Minio

        client = Minio(
            settings.minio_endpoint, access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key, secure=settings.minio_secure,
        )
        client.remove_object(settings.minio_bucket, storage_key)
        return

    path = os.path.join(settings.storage_local_dir, storage_key)
    root = os.path.abspath(settings.storage_local_dir)
    if os.path.abspath(path).startswith(root + os.sep) and os.path.exists(path):
        os.remove(path)

