# Company documents

Do not commit private company documents to GitHub. This folder is only a placeholder explaining the data boundary.

Production documents are uploaded to the private Cloudflare R2 bucket through the Worker `/upload` endpoint. R2 events or the Queue trigger indexing into D1 and Vectorize. GitHub stores code and configuration only.
