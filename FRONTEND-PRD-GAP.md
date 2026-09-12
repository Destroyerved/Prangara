# PRD v2 integration audit — 12 September 2026

The current approved visual system is preserved. Backend main aca0e142 now exposes platform APIs, superseding the earlier unavailable-contract assessment. This update implements the supported workflows in the existing standalone frontend.

Available: authentication/session rotation, organizations, factories/sites/profiles/activity/assets, intake confirmation, persisted assessment history, scenarios, provider matching/services/materials/RFQs/quotes, evidence, compliance case workflows, action tracker/M&V, notifications and audit.

Contract limitations: OCR extraction returns `unavailable` and stores evidence for manual entry. No RAG, route optimization, pooling, capacity exchange, supplier-scoring, finance or job-management endpoints are published. Rule evaluation is queued; completion depends on the evaluator/worker. Quick-win totals are available but action membership and a separately recomputed curve are absent; the browser must not invent them. Source provenance is available through reference endpoints.

Validation and final feature matrix will be recorded in HANDOFF_WEB.md before push.
