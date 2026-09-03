import type { FileType } from "@/lib/types";

export function inferFileType(filename: string, mimeType: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (ext === "docx" || mimeType.includes("wordprocessingml")) return "docx";
  if (ext === "pptx" || mimeType.includes("presentationml")) return "pptx";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext) || mimeType.startsWith("image/")) return "image";
  return "other";
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse's bundled pdf.js worker references DOMMatrix, which doesn't exist in the
  // Node.js runtime (only in browsers). @napi-rs/canvas — already a pdf-parse dependency —
  // ships a compatible polyfill; without it every PDF extraction fails at runtime.
  if (typeof (globalThis as { DOMMatrix?: unknown }).DOMMatrix === "undefined") {
    const { DOMMatrix } = await import("@napi-rs/canvas");
    (globalThis as { DOMMatrix?: unknown }).DOMMatrix = DOMMatrix;
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractPptx(buffer: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const { XMLParser } = await import("fast-xml-parser");
  const zip = await JSZip.loadAsync(buffer);
  const parser = new XMLParser({ ignoreAttributes: true, textNodeName: "#text" });

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)?.[1] ?? "0", 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] ?? "0", 10);
      return na - nb;
    });

  const texts: string[] = [];
  for (const path of slideFiles) {
    const xml = await zip.files[path].async("string");
    const texRuns: string[] = [];
    // <a:t>text</a:t> runs hold the visible text on each slide
    const matches = xml.matchAll(/<a:t>([^<]*)<\/a:t>/g);
    for (const m of matches) texRuns.push(m[1]);
    if (texRuns.length) texts.push(texRuns.join(" "));
    void parser; // parser reserved for richer structure extraction if needed later
  }
  return texts.join("\n\n");
}

async function extractImage(buffer: Buffer): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa+eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

/** Removes repeated headers/footers and page-number lines from extracted text. */
export function cleanExtractedText(text: string): string {
  const lines = text.split("\n").map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const counts = new Map<string, number>();
  for (const line of nonEmpty) {
    if (line.length < 3 || line.length > 120) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  const repeatedThreshold = Math.max(3, Math.floor(nonEmpty.length / 20));
  const repeated = new Set(
    [...counts.entries()].filter(([, count]) => count >= repeatedThreshold).map(([line]) => line)
  );

  const isPageNumber = (line: string) => /^(page\s*)?\d+(\s*\/\s*\d+)?$/i.test(line);

  return lines
    .filter((line) => !repeated.has(line) && !isPageNumber(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractText(buffer: Buffer, fileType: FileType): Promise<string> {
  let raw: string;
  switch (fileType) {
    case "pdf":
      raw = await extractPdf(buffer);
      break;
    case "docx":
      raw = await extractDocx(buffer);
      break;
    case "pptx":
      raw = await extractPptx(buffer);
      break;
    case "image":
      raw = await extractImage(buffer);
      break;
    default:
      raw = buffer.toString("utf-8");
  }
  return cleanExtractedText(raw);
}

/** Splits long text into chunks that stay comfortably under a model's context budget. */
export function chunkText(text: string, maxChars = 60000): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    const lastBreak = text.lastIndexOf("\n\n", end);
    if (lastBreak > start + maxChars * 0.5) end = lastBreak;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
