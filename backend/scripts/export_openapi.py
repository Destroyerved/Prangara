"""
Write the OpenAPI schema to `packages/contracts/openapi.json`.

task.md section 3: the backend owns the shared contract, and the web and mobile
clients consume types generated from it. Running this after any schema change is
what keeps three codebases from inventing three spellings of the same field.

    python -m scripts.export_openapi

Clients then generate types from the committed file, for example:

    npx openapi-typescript packages/contracts/openapi.json -o packages/contracts/api.d.ts
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

OUT = Path(__file__).resolve().parent.parent.parent / "packages" / "contracts" / "openapi.json"


def main() -> None:
    schema = app.openapi()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(OUT.parent.parent.parent)} "
          f"({len(schema['paths'])} paths, {len(schema['components']['schemas'])} schemas)")


if __name__ == "__main__":
    main()
