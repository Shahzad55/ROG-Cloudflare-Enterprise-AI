# R2 document retention and deletion policy

Status: proposed default for ROG Cloudflare Enterprise AI

## Defaults

- Original company files stay in the private R2 bucket until an authorized workspace administrator deletes them.
- No automatic permanent deletion is enabled by default. Enterprise records must not disappear because of an accidental lifecycle rule.
- Every object is stored under `tenantId/documentId/fileName` and must never be shared across tenants.
- D1 metadata and Vectorize chunks are treated as derived data and must follow the same document deletion request.

## Deletion flow

1. An authenticated workspace administrator requests deletion of a document.
2. The document is marked `deletion_requested` in D1 and hidden from search immediately.
3. The system removes all Vectorize vectors for the document and deletes its D1 chunks.
4. The original object is moved to a tenant quarantine prefix, for example `_quarantine/<tenantId>/<documentId>/`.
5. Keep the quarantined object for 30 days for accidental-deletion recovery.
6. After 30 days, permanently delete the R2 object and record a deletion receipt containing tenant ID, document ID, actor, reason, and timestamp. Never record document contents or secrets in the receipt.

## Retention classes

A tenant may choose one of these policies before production:

- `standard`: retain until an administrator deletes it; 30-day quarantine after deletion request.
- `90-days`: automatically quarantine documents 90 days after their last update; permanently delete them 30 days later.
- `7-years`: retain documents for seven years, then quarantine and permanently delete after 30 days. Use only where the customer has approved this legal-retention requirement.
- `legal-hold`: never automatically quarantine or permanently delete until the hold is released by an authorized administrator.

The tenant policy must be stored as configuration, not inferred from the filename or document contents.

## Security requirements

- R2 buckets remain private. Do not enable public `r2.dev` access for company documents.
- Replace the MVP `x-tenant-id` header with verified authentication and role-based authorization before production.
- Require an explicit administrator role for deletion and legal-hold changes.
- Log access, deletion requests, quarantine moves, permanent deletion, and policy changes in an append-only audit store.
- Keep audit records free of document text, PDF contents, email bodies, API keys, and personal secrets.
- Deleting a source document must also remove its derived D1 chunks and Vectorize vectors.
- Backups and replicas must have a documented retention period and deletion process; deleting the live object alone is not enough for a compliance claim.

## Implementation notes

R2 lifecycle rules are useful for approved automatic-retention classes, but they must not replace authorization and application-level deletion coordination. The Worker should mark the document unavailable first, remove derived search data, then quarantine the source. Configure bucket lifecycle rules only after the tenant retention class is known and tested in a non-production bucket.

This policy is a product default, not legal advice. Each customer must approve retention, legal hold, backup, and data-residency requirements before production use.
