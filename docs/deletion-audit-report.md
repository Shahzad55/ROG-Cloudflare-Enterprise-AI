# Document deletion audit report

## Purpose

This report proves that a document deletion request was authorized, that the document became unavailable to search immediately, and that the source and derived data were deleted according to the tenant retention policy.

It must never contain document contents, email bodies, PDF text, API keys, access tokens, or full personal data.

## Report identity

| Field | Description |
|---|---|
| `report_id` | Unique report identifier, for example `delrpt_<uuid>` |
| `tenant_id` | Tenant/workspace identifier |
| `period_start` | Inclusive UTC start time |
| `period_end` | Exclusive UTC end time |
| `generated_at` | UTC generation time |
| `generated_by` | Service or administrator that generated the report |
| `policy_version` | Retention-policy version used for evaluation |
| `status` | `complete`, `partial`, or `failed` |

## Executive summary

The report should show:

- total deletion requests received;
- requests approved and rejected;
- documents hidden from search;
- Vectorize vectors removed;
- D1 chunks removed;
- R2 objects quarantined;
- R2 objects permanently deleted;
- legal holds that blocked deletion;
- failed or delayed steps;
- records requiring administrator review.

Example:

```json
{
  "report_id": "delrpt_01J...",
  "tenant_id": "acme",
  "period_start": "2026-10-01T00:00:00Z",
  "period_end": "2026-11-01T00:00:00Z",
  "generated_at": "2026-11-01T00:05:00Z",
  "generated_by": "rog-audit-worker",
  "policy_version": "2026-10-22.v1",
  "status": "complete",
  "summary": {
    "requested": 18,
    "approved": 17,
    "rejected": 1,
    "search_hidden": 17,
    "vectorize_deleted": 17,
    "d1_chunks_deleted": 17,
    "r2_quarantined": 17,
    "r2_permanently_deleted": 12,
    "legal_hold_blocked": 1,
    "exceptions": 0
  }
}
```

## Per-document deletion record

One row must exist for every request:

| Field | Required | Description |
|---|---:|---|
| `event_id` | Yes | Unique audit-event ID |
| `tenant_id` | Yes | Owning tenant |
| `document_id` | Yes | Internal document ID, not filename |
| `request_id` | Yes | ID connecting all steps |
| `requested_at` | Yes | UTC timestamp |
| `requested_by` | Yes | Authenticated actor ID or service principal |
| `actor_role` | Yes | Role used for authorization |
| `reason_code` | Yes | `user_request`, `retention_expired`, `legal_request`, `duplicate`, or `other` |
| `legal_hold` | Yes | Boolean at evaluation time |
| `policy_class` | Yes | `standard`, `90-days`, `7-years`, or `legal-hold` |
| `search_hidden_at` | Yes | When the document stopped appearing in retrieval |
| `vector_count_expected` | Yes | Count recorded before deletion |
| `vector_count_deleted` | Yes | Count successfully removed |
| `d1_chunk_count_expected` | Yes | Count recorded before deletion |
| `d1_chunk_count_deleted` | Yes | Count successfully removed |
| `r2_object_key_hash` | Yes | HMAC/hash of the object key, never the raw key in external reports |
| `r2_quarantined_at` | No | UTC timestamp |
| `quarantine_until` | No | UTC expiry timestamp, normally +30 days |
| `r2_deleted_at` | No | Permanent deletion timestamp |
| `backup_status` | Yes | `not_applicable`, `pending`, `expired`, `verified`, or `unknown` |
| `result` | Yes | `completed`, `blocked`, `partial`, or `failed` |
| `exception_code` | No | Stable code for a failed step |

## Required event sequence

The audit trail should make this order verifiable:

1. `deletion.requested`
2. `deletion.authorized` or `deletion.rejected`
3. `document.search_hidden`
4. `vectorize.deletion_started`
5. `vectorize.deletion_completed`
6. `d1.chunks_deletion_completed`
7. `r2.quarantine_started`
8. `r2.quarantine_completed`
9. `r2.permanent_deletion_started`
10. `r2.permanent_deletion_completed`
11. `deletion.completed` or `deletion.exception`

A later event must not be accepted if its predecessor is missing, unless an administrator marks the record as an approved exception.

## Control checks

The report generator should run these checks:

- **Authorization:** actor had the required administrator role.
- **Tenant isolation:** every record belongs to exactly one tenant.
- **Search removal:** no active D1 document record or Vectorize match remains searchable.
- **Vector completeness:** deleted-vector count equals the count recorded before deletion.
- **Chunk completeness:** no D1 chunk remains for the document ID.
- **R2 state:** source object is quarantined or permanently absent as expected.
- **Legal hold:** no object under active legal hold was permanently deleted.
- **Retention timing:** quarantine and permanent deletion timestamps respect the policy.
- **Replay safety:** repeating the deletion job does not create duplicate destructive events.
- **Audit integrity:** events are append-only and chained with a previous-event hash or equivalent tamper-evident mechanism.

## Exception table

| Code | Meaning | Action |
|---|---|---|
| `AUTHORIZATION_MISSING` | Actor could not be verified | Block and alert |
| `LEGAL_HOLD_ACTIVE` | Legal hold prevents deletion | Keep source, hide only if policy allows |
| `VECTOR_COUNT_MISMATCH` | Not all vectors were removed | Retry and keep report partial |
| `D1_CHUNKS_REMAIN` | Derived text remains | Retry and block completion |
| `R2_OBJECT_REMAINS` | Source still exists after expiry | Retry and alert |
| `BACKUP_UNKNOWN` | Backup deletion cannot be verified | Mark unknown, do not claim compliance |
| `EVENT_GAP` | Required audit event is missing | Mark report incomplete |

## Delivery formats

- **Administrator dashboard:** summary cards, exception table, and filters by date/policy/result.
- **CSV export:** one row per document deletion, with no document content.
- **JSON export:** report metadata, summary, per-document records, and exceptions.
- **Compliance PDF:** signed summary plus checksums of the JSON export.

## Important boundary

A successful R2 deletion does not prove that every backup, replica, cache, browser download, or external integration copy was deleted. The report must state exactly which systems were checked and mark all others as `unknown`. This is an audit design, not a legal certification.
