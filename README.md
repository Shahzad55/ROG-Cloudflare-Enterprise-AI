# ROG Cloudflare Enterprise AI

A Persian, document-grounded enterprise AI assistant for stores, construction companies, manufacturers, and business teams.

## Architecture

- **Cloudflare Worker**: authenticated API for upload and chat.
- **R2**: private source-document storage.
- **Queues**: asynchronous indexing path.
- **D1**: document and chunk metadata.
- **Vectorize V2**: semantic retrieval filtered by `tenantId`.
- **Workers AI Markdown Conversion**: extracts text from PDF and DOCX.
- **Workers AI**: embeddings and grounded answer generation.

GitHub stores code only. Do not upload confidential company documents to this repository.

## Supported uploads

The Worker accepts `.txt`, `.md`, `.json`, `.pdf`, and `.docx` files up to 10 MiB. PDF and DOCX are converted to Markdown by `env.AI.toMarkdown()` during asynchronous queue processing, then chunked, embedded, and stored in Vectorize. This uses Cloudflare's native Markdown Conversion instead of adding a fragile PDF/DOCX parser to the Worker.

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

Copy the D1 database ID into `wrangler.toml` before deploy. The AI binding already enables Markdown Conversion. For production, replace the demo `x-tenant-id` header with real authentication and authorization.

## API

Upload a document:

```bash
curl -X POST https://YOUR_WORKER/upload \
  -H 'x-tenant-id: acme' \
  -F 'file=@company-policy.pdf'
```

Ask a grounded question:

```bash
curl -X POST https://YOUR_WORKER/chat \
  -H 'content-type: application/json' \
  -H 'x-tenant-id: acme' \
  -d '{"question":"شرایط مرجوعی چیست؟"}'
```

Indexing is asynchronous. The upload response is `202 queued`; wait for the queue consumer to mark the document ready before querying it.

## Important limits

Cloudflare's Markdown Conversion supports PDF and Microsoft Office formats including DOCX. Keep files under 10 MiB for this MVP. For scanned PDFs, OCR and conversion limits apply. For larger or more complex ingestion, use a dedicated workflow or Cloudflare AI Search with R2 as a data source.
