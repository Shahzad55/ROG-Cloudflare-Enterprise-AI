interface Env {
  AI: Ai;
  DOCUMENTS: R2Bucket;
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  INDEX_QUEUE: Queue;
  EMBEDDING_MODEL: string;
  GENERATION_MODEL: string;
}

type IndexMessage = { documentId: string; tenantId: string; objectKey: string; fileName: string };
type EmbeddingResult = { shape: number[]; data: number[][] };
type MarkdownResult = { name: string; format: string; data?: string; error?: string };

const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type, authorization, x-tenant-id",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });

function requireTenant(request: Request): string {
  const tenant = request.headers.get("x-tenant-id")?.trim();
  if (!tenant || !/^[a-zA-Z0-9_-]{2,80}$/.test(tenant)) throw new Error("x-tenant-id is required");
  return tenant;
}

// Normalize Arabic/Persian spelling variants for retrieval without changing the stored source text.
function normalizeRtl(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ی")
    .replace(/ئ/g, "ی")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isArabicOrPersian(text: string): boolean {
  const rtl = text.match(/[\u0600-\u06FF]/g)?.length || 0;
  const latin = text.match(/[A-Za-z]/g)?.length || 0;
  return rtl > 0 && rtl >= latin;
}

function chunks(text: string, size = 1200, overlap = 180): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const result: string[] = [];
  for (let start = 0; start < clean.length; start += size - overlap) {
    result.push(clean.slice(start, Math.min(start + size, clean.length)));
    if (start + size >= clean.length) break;
  }
  return result;
}

async function embed(env: Env, texts: string[]) {
  const response = (await env.AI.run(env.EMBEDDING_MODEL, { text: texts.map(normalizeRtl) })) as EmbeddingResult;
  return response.data;
}

async function upload(request: Request, env: Env) {
  const tenantId = requireTenant(request);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "file is required" }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ error: "max file size is 10MB" }, 413);
  const extension = file.name.toLowerCase().split(".").pop() || "";
  const supported = ["txt", "md", "json", "pdf", "docx"];
  if (!supported.includes(extension)) return json({ error: "supported files: .txt, .md, .json, .pdf, .docx" }, 415);

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `${tenantId}/${id}/${safeName}`;
  await env.DOCUMENTS.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { tenantId, documentId: id, title: file.name },
  });
  await env.DB.prepare("INSERT INTO documents (id, tenant_id, object_key, title, content_type) VALUES (?, ?, ?, ?, ?)")
    .bind(id, tenantId, objectKey, file.name, file.type || "application/octet-stream").run();
  await env.INDEX_QUEUE.send({ documentId: id, tenantId, objectKey, fileName: file.name } satisfies IndexMessage);
  return json({ ok: true, id, status: "queued", title: file.name, type: extension }, 202);
}

async function extractText(object: R2ObjectBody, fileName: string, env: Env): Promise<string> {
  const extension = fileName.toLowerCase().split(".").pop() || "";
  if (!["pdf", "docx"].includes(extension)) return await object.text();
  const blob = new Blob([await object.arrayBuffer()], {
    type: object.httpMetadata?.contentType || (extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
  });
  const converted = (await env.AI.toMarkdown(
    { name: fileName, blob },
    { conversionOptions: { output: { format: "text" }, pdf: { metadata: false } } },
  )) as MarkdownResult;
  if (converted.format === "error" || !converted.data?.trim()) throw new Error(`OCR/text extraction failed for ${fileName}: ${converted.error || "no text detected"}`);
  return converted.data;
}

async function indexDocument(message: IndexMessage, env: Env) {
  const object = await env.DOCUMENTS.get(message.objectKey);
  if (!object) throw new Error(`R2 object not found: ${message.objectKey}`);
  const text = await extractText(object, message.fileName, env);
  const parts = chunks(text);
  if (!parts.length) throw new Error("document contains no extractable text");
  const vectors = await embed(env, parts);
  await env.DB.prepare("DELETE FROM chunks WHERE document_id = ?").bind(message.documentId).run();
  await env.DB.batch(parts.map((part, i) => env.DB.prepare("INSERT INTO chunks (id, document_id, tenant_id, chunk_index, text) VALUES (?, ?, ?, ?, ?)").bind(`${message.documentId}:${i}`, message.documentId, message.tenantId, i, part)));
  await env.VECTORIZE.upsert(parts.map((part, i) => ({ id: `${message.documentId}:${i}`, values: vectors[i], metadata: { tenantId: message.tenantId, documentId: message.documentId, chunkIndex: i, language: isArabicOrPersian(part) ? "rtl" : "other" } })));
  await env.DB.prepare("UPDATE documents SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(message.documentId).run();
}

async function chat(request: Request, env: Env) {
  const tenantId = requireTenant(request);
  const body = (await request.json()) as { question?: string };
  if (!body.question?.trim()) return json({ error: "question is required" }, 400);
  const rtlQuestion = isArabicOrPersian(body.question);
  const [queryVector] = await embed(env, [body.question]);
  const matches = await env.VECTORIZE.query(queryVector, { topK: 5, returnMetadata: "all", filter: { tenantId } });
  const ids = matches.matches.map((m) => m.id);
  if (!ids.length) return json({ answer: rtlQuestion ? "در اسناد این شرکت پاسخی پیدا نشد." : "No answer was found in this company's documents.", sources: [] });
  const placeholders = ids.map(() => "?").join(",");
  const rows = await env.DB.prepare(`SELECT id, text FROM chunks WHERE id IN (${placeholders})`).bind(...ids).all<{ id: string; text: string }>();
  const byId = new Map(rows.results.map((row) => [row.id, row.text]));
  const context = matches.matches.map((m, i) => `[منبع ${i + 1}]\n${byId.get(m.id) || ""}`).join("\n\n");
  const answer = await env.AI.run(env.GENERATION_MODEL, { messages: [
    { role: "system", content: `فقط بر اساس CONTEXT پاسخ بده. اگر پاسخ در آن نیست، ${rtlQuestion ? "به زبان سؤال بگو اطلاعات کافی در اسناد پیدا نشد" : "say that the documents do not contain enough information"}. ${rtlQuestion ? "به همان زبان سؤال، فارسی یا عربی، کوتاه و بدون حدس پاسخ بده." : "Answer in the language of the question, briefly and without guessing."}` },
    { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION:\n${body.question}` },
  ] });
  return json({ answer, sources: matches.matches.map((m, i) => ({ label: `منبع ${i + 1}`, score: m.score })) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers });
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, embeddingModel: env.EMBEDDING_MODEL });
      if (request.method === "POST" && url.pathname === "/upload") return upload(request, env);
      if (request.method === "POST" && url.pathname === "/chat") return chat(request, env);
      return json({ error: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
    }
  },
  async queue(batch: MessageBatch<IndexMessage>, env: Env) {
    for (const message of batch.messages) {
      try { await indexDocument(message.body, env); message.ack(); }
      catch (error) { console.error(error); message.retry(); }
    }
  },
};
