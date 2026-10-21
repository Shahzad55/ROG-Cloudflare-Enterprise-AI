# ROG Cloudflare Enterprise AI

A Persian, document-grounded enterprise AI assistant for stores, construction companies, manufacturers, and business teams.

## OCR for scanned PDFs

PDF and DOCX uploads are processed with Cloudflare Workers AI Markdown Conversion via `env.AI.toMarkdown()`. Cloudflare parses PDF pages and applies its supported OCR path for scanned PDFs, then returns plain text for chunking and RAG. The Worker uses `conversionOptions.output.format = "text"` and removes PDF metadata before embedding.

The MVP accepts PDF and DOCX files up to 10 MiB. Cloudflare's documented limits differ by PDF mode: PDFs with OCR enabled can be up to 10 MiB, while PDFs without OCR are limited to 4 MiB. If extraction returns no text, the Queue retries the message and logs an explicit extraction error instead of indexing an empty document.

## Architecture

- **Cloudflare Worker**: authenticated API for upload and chat.
- **R2**: private source-document storage.
- **Queues**: asynchronous indexing path.
- **D1**: document and chunk metadata.
- **Vectorize V2**: semantic retrieval filtered by `tenantId`.
- **Workers AI Markdown Conversion**: PDF/DOCX extraction and OCR-capable conversion.
- **Workers AI**: embeddings and grounded answer generation.

GitHub stores code only. Do not upload confidential company documents to this repository.

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

Copy the D1 database ID into `wrangler.toml` before deploy. For production, replace the demo `x-tenant-id` header with real authentication and authorization.

## API

```bash
curl -X POST https://YOUR_WORKER/upload \
  -H 'x-tenant-id: acme' \
  -F 'file=@scanned-contract.pdf'
```

Indexing is asynchronous. The upload response is `202 queued`; wait for the queue consumer to mark the document ready before querying it.

## References

- https://developers.cloudflare.com/workers-ai/features/markdown-conversion/usage/binding/
- https://developers.cloudflare.com/workers-ai/features/markdown-conversion/conversion-options/
- https://developers.cloudflare.com/ai-search/configuration/data-source/
