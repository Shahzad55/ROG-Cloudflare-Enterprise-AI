# Cloudflare production checklist

## 1. Account and access

- [ ] Confirm Wrangler is logged into the intended Cloudflare account.
- [ ] Confirm the project profile is bound to this repository directory.
- [ ] Add the correct `account_id` to `wrangler.toml`.
- [ ] Use least-privilege roles for developers, deployers, and administrators.
- [ ] Never commit API tokens, passwords, customer documents, or `.dev.vars`.

## 2. Resources

- [ ] Enable R2 billing/subscription in the Cloudflare Dashboard.
- [ ] Create the private R2 bucket `rog-enterprise-documents`.
- [ ] Create the D1 database `rog-enterprise-db`.
- [ ] Put the real D1 `database_id` in `wrangler.toml`.
- [ ] Create the Queue `rog-document-indexing`.
- [ ] Create Vectorize index `rog-enterprise-vectors-multilingual` with 1024 dimensions and cosine distance.
- [ ] Create the Vectorize metadata index for `tenantId` before inserting vectors.
- [ ] Confirm the Workers AI binding is enabled.
- [ ] Configure R2 `object-create` notifications to the indexing Queue.

## 3. Data protection

- [ ] Keep the R2 bucket private; do not enable public `r2.dev` access.
- [ ] Use authenticated upload URLs or an authenticated Worker endpoint.
- [ ] Replace the MVP `x-tenant-id` header with verified authentication and role-based authorization.
- [ ] Enforce tenant isolation in D1, R2 object keys, and Vectorize filters.
- [ ] Validate file size, extension, MIME type, and upload authorization.
- [ ] Define retention, quarantine, legal hold, and permanent deletion behavior.
- [ ] Delete derived D1 chunks and Vectorize vectors when a source document is deleted.
- [ ] Keep audit logs free of document contents, email bodies, secrets, and unnecessary personal data.

## 4. Secrets and configuration

- [ ] Store production secrets with `wrangler secret put`, never in Git.
- [ ] Use separate credentials for development, staging, and production.
- [ ] Pin allowed model IDs and keep model changes reviewed.
- [ ] Restrict CORS to the real application origin; remove `*` before launch.
- [ ] Add request size, rate, timeout, and concurrency limits.
- [ ] Configure error responses that do not expose internal IDs or stack traces.

## 5. RAG and document ingestion

- [ ] Use `@cf/baai/bge-m3` for Persian-first multilingual retrieval.
- [ ] Use `@cf/qwen/qwen3-30b-a3b-fp8` or an approved fallback for answers.
- [ ] Re-index all documents after any embedding model or Vectorize dimension change.
- [ ] Test Persian normalization: ی/ي, ک/ك, Arabic diacritics, نیم‌فاصله, Persian digits, and dates.
- [ ] Test Arabic as a secondary language.
- [ ] Test PDF, scanned PDF OCR, DOCX, TXT, Markdown, and JSON uploads.
- [ ] Reject empty extraction results and retry failed Queue messages safely.
- [ ] Return source references and refuse to guess when evidence is missing.
- [ ] Add a small golden set of Persian questions with expected source chunks.

## 6. Deployment validation

Run from the repository root:

```powershell
npm install
npx wrangler whoami
npx wrangler types
npx tsc --noEmit
npx wrangler d1 migrations apply rog-enterprise-db --remote
npx wrangler deploy --dry-run
npx wrangler deploy
```

Then verify:

```powershell
curl https://YOUR_WORKER.workers.dev/health
```

- [ ] Health endpoint returns success.
- [ ] Worker lists the intended D1, R2, Queue, Vectorize, and AI bindings.
- [ ] Upload returns `202 queued`.
- [ ] Queue marks a valid document ready.
- [ ] Persian question retrieves the correct source.
- [ ] A tenant cannot retrieve another tenant's document.
- [ ] Unsupported, oversized, and empty files are rejected.
- [ ] PDF OCR output is checked against the source sample.

## 7. Observability and cost

- [ ] Enable Worker logs and alerts for exceptions, retries, and latency.
- [ ] Monitor Queue backlog and dead-letter/retry behavior.
- [ ] Monitor Vectorize query latency and no-result rate.
- [ ] Track Workers AI neuron/token usage and set budget alerts.
- [ ] Track R2 storage, Class A, and Class B operations.
- [ ] Run load tests against a staging environment first.
- [ ] Record p50/p95 latency, error rate, throughput, and cost per question.
- [ ] Never run a large paid load test in production without an approved budget.

## 8. Go/no-go gate

Go live only when all of these are true:

- [ ] R2 is enabled and the private bucket exists.
- [ ] D1 migration is applied successfully.
- [ ] Vectorize index and tenant metadata index exist.
- [ ] Production authentication and authorization are active.
- [ ] CORS is restricted.
- [ ] Upload, OCR, indexing, retrieval, deletion, and tenant-isolation tests pass.
- [ ] Logs, alerts, retention policy, and rollback plan are documented.
- [ ] A cost ceiling is approved.

Current known blocker: R2 must be enabled in the Cloudflare Dashboard before the Worker can deploy with the `DOCUMENTS` binding.
