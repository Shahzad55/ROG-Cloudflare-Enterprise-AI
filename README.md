# ROG Cloudflare Enterprise AI

A Persian and Arabic document-grounded enterprise AI assistant for stores, construction companies, manufacturers, and business teams.

## Persian and Arabic RAG

The retrieval layer now uses Cloudflare-hosted `@cf/baai/bge-m3`, a multilingual embedding model, instead of the English-only BGE base model. Arabic/Persian diacritics and common spelling variants are normalized before embedding, while the original source text remains unchanged in D1 for citations. Answers follow the language of the question when it is Persian or Arabic.

This is a **breaking vector-index change**: Vectorize dimensions are fixed at index creation. Create the new multilingual index and re-index all existing documents before production:

```bash
npx wrangler vectorize create rog-enterprise-vectors-multilingual --dimensions=1024 --metric=cosine
npx wrangler vectorize create-metadata-index rog-enterprise-vectors-multilingual --property-name=tenantId --type=string
npx wrangler d1 migrations apply rog-enterprise-db --remote
npx wrangler deploy
```

Do not point the new Worker at the old 768-dimensional index. Existing documents must be uploaded again or re-queued after the new index is ready.

## OCR and supported uploads

PDF and DOCX files are converted by Cloudflare Workers AI Markdown Conversion, including its supported OCR path for scanned PDFs, before chunking and indexing. The MVP accepts `.txt`, `.md`, `.json`, `.pdf`, and `.docx` up to 10 MiB.

## Architecture

- Cloudflare Worker: upload, retrieval, and grounded answers.
- R2: private source-document storage.
- Queues: asynchronous indexing.
- D1: original chunks and document metadata.
- Vectorize V2: multilingual semantic retrieval filtered by `tenantId`.
- Workers AI: BGE-M3 embeddings, PDF/DOCX conversion, and Qwen3 answer generation.

GitHub stores code only. Never commit confidential company documents.

## API

```bash
curl -X POST https://YOUR_WORKER/upload \
  -H 'x-tenant-id: acme' \
  -F 'file=@arabic-policy.pdf'

curl -X POST https://YOUR_WORKER/chat \
  -H 'content-type: application/json' \
  -H 'x-tenant-id: acme' \
  -d '{"question":"ما هي شروط الإرجاع؟"}'
```

Indexing is asynchronous; wait for the queue to finish before asking questions.

## Cloudflare references

- https://developers.cloudflare.com/workers-ai/models/bge-m3/
- https://developers.cloudflare.com/vectorize/reference/metadata-filtering/
- https://developers.cloudflare.com/workers-ai/features/markdown-conversion/
