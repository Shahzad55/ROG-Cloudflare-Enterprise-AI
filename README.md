# ROG Cloudflare Enterprise AI

A Persian, document-grounded enterprise AI assistant for stores, construction companies, manufacturers, and business teams.

## Architecture

- **Cloudflare Worker**: authenticated API for upload and chat.
- **R2**: private source-document storage.
- **R2 event notifications + Queues**: asynchronous indexing path.
- **D1**: document and chunk metadata.
- **Vectorize V2**: semantic retrieval, filtered by `tenantId`.
- **Workers AI**: embeddings and grounded answer generation.

GitHub is intentionally used for code only. Do not upload confidential company documents to this repository.

## Cloudflare setup

```bash
npx wrangler login
npx wrangler r2 bucket create rog-enterprise-documents
npx wrangler queues create rog-document-indexing
npx wrangler d1 create rog-enterprise-db
npx wrangler vectorize create rog-enterprise-vectors --dimensions=768 --metric=cosine
npx wrangler vectorize create-metadata-index rog-enterprise-vectors --property-name=tenantId --type=string
npx wrangler d1 migrations apply rog-enterprise-db --remote
npx wrangler deploy
```

Copy the D1 database ID into `wrangler.toml` before deploy. Configure an R2 `object-create` notification for `rog-document-indexing` in the Cloudflare dashboard or with Wrangler. For production, replace the demo `x-tenant-id` header with real authentication and authorization.

## API

Upload a supported `.txt`, `.md`, or `.json` document:

```bash
curl -X POST https://YOUR_WORKER/upload \
  -H 'x-tenant-id: acme' \
  -F 'file=@company-policy.md'
```

Ask a grounded question:

```bash
curl -X POST https://YOUR_WORKER/chat \
  -H 'content-type: application/json' \
  -H 'x-tenant-id: acme' \
  -d '{"question":"شرایط مرجوعی چیست؟"}'
```

The current MVP intentionally starts with text-like files. PDF/DOCX extraction should be added as a separate processing step before indexing, rather than pretending the Worker can safely parse every format by default.
