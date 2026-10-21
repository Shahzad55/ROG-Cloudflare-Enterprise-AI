# Company documents

Do not commit private company documents to GitHub. This folder is only a placeholder explaining the data boundary.

Production documents are uploaded to the private Cloudflare R2 bucket through the Worker `/upload` endpoint. PDF and DOCX files are converted by Cloudflare Workers AI Markdown Conversion during queue processing, then indexed into D1 and Vectorize.
