import type { TextItem } from "./pdfParse";

/** Minimal slice of the pdf.js API we rely on (shared by browser and tests). */
interface PdfJsLike {
  getDocument(src: { data: Uint8Array; isEvalSupported?: boolean }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{ items: unknown[] }>;
      }>;
    }>;
  };
}

export async function extractItems(pdfjs: PdfJsLike, data: Uint8Array): Promise<TextItem[]> {
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const out: TextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      const it = raw as { str?: string; transform?: number[]; width?: number };
      if (!it.str || !it.transform) continue;
      out.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width ?? 0, page: p });
    }
  }
  return out;
}

/** Browser-only: loads pdf.js lazily so it never runs during static prerender. */
export async function extractItemsInBrowser(file: File): Promise<TextItem[]> {
  const pdfjs = await import("pdfjs-dist");
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  pdfjs.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;
  const data = new Uint8Array(await file.arrayBuffer());
  return extractItems(pdfjs as unknown as PdfJsLike, data);
}
