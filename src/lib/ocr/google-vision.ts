import "server-only";

import { OcrError, type OcrProvider, type OcrResult } from "./types";

const ENDPOINT_IMAGES = "https://vision.googleapis.com/v1/images:annotate";
const ENDPOINT_FILES = "https://vision.googleapis.com/v1/files:annotate";

const SUPPORTED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/gif",
  "image/bmp",
]);

/** Inline-content limit per Google Vision request. Larger PDFs must go via GCS. */
const INLINE_MAX_BYTES = 20 * 1024 * 1024;

interface VisionResponse {
  responses: Array<{
    fullTextAnnotation?: { text?: string; pages?: unknown[] };
    textAnnotations?: Array<{ description?: string; locale?: string }>;
    error?: { code?: number; message?: string };
  }>;
}

/**
 * Google Cloud Vision DOCUMENT_TEXT_DETECTION via REST.
 *
 * Uses API key auth (simpler than service-account JWT). The key MUST be
 * scoped to the Vision API only — set restrictions in GCP Console.
 *
 * Thai is requested first in language hints since Vision's detector
 * sometimes mis-classifies short Thai snippets as a Lao/Khmer variant
 * when English appears first.
 */
class GoogleVisionProvider implements OcrProvider {
  name = "google-vision";

  supports(mimeType: string): boolean {
    if (SUPPORTED_IMAGE_MIME.has(mimeType)) return true;
    if (mimeType === "application/pdf") return true;
    return false;
  }

  async extract(file: Blob, mimeType: string): Promise<OcrResult> {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new OcrError("no_api_key", "GOOGLE_VISION_API_KEY is not configured", false);
    }
    if (!this.supports(mimeType)) {
      throw new OcrError("unsupported_mime", `OCR not supported for ${mimeType}`, false);
    }
    if (file.size > INLINE_MAX_BYTES) {
      throw new OcrError(
        "size_exceeded",
        `File ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 20 MB inline limit. Use GCS-async OCR (Phase 4).`,
        false
      );
    }

    const base64 = await blobToBase64(file);
    return mimeType === "application/pdf"
      ? this.callFilesAnnotate(apiKey, base64)
      : this.callImagesAnnotate(apiKey, base64);
  }

  private async callImagesAnnotate(apiKey: string, base64: string): Promise<OcrResult> {
    const body = {
      requests: [
        {
          image: { content: base64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
          imageContext: { languageHints: ["th", "en"] },
        },
      ],
    };
    const res = await fetch(`${ENDPOINT_IMAGES}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.parseResponse(res);
  }

  private async callFilesAnnotate(apiKey: string, base64: string): Promise<OcrResult> {
    const body = {
      requests: [
        {
          inputConfig: {
            content: base64,
            mimeType: "application/pdf",
          },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["th", "en"] },
        },
      ],
    };
    const res = await fetch(`${ENDPOINT_FILES}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.parseResponse(res);
  }

  private async parseResponse(res: Response): Promise<OcrResult> {
    if (res.status === 401 || res.status === 403) {
      throw new OcrError(
        "provider_unauthorized",
        `Google Vision auth failed (HTTP ${res.status})`,
        false
      );
    }
    if (res.status === 429) {
      throw new OcrError("provider_rate_limited", "Google Vision rate limit hit", true);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new OcrError(
        "provider_error",
        `Google Vision HTTP ${res.status}: ${text.slice(0, 200)}`,
        res.status >= 500
      );
    }

    const json = (await res.json()) as VisionResponse;
    const first = json.responses?.[0];
    if (!first) {
      throw new OcrError("empty_result", "No response from Google Vision", true);
    }
    if (first.error) {
      throw new OcrError("provider_error", first.error.message ?? "Unknown Vision error", false);
    }

    // files:annotate (PDF) returns an array of per-page responses inside
    // the first responses[].responses field. images:annotate returns the
    // text directly on the first responses[].
    interface PageResponse {
      fullTextAnnotation?: { text?: string };
      textAnnotations?: Array<{ locale?: string }>;
    }
    const inner = (first as unknown as { responses?: PageResponse[] }).responses;
    const pages: PageResponse[] = Array.isArray(inner) ? inner : [first];

    const parts: string[] = [];
    const langs = new Set<string>();
    for (const p of pages) {
      const text = p?.fullTextAnnotation?.text ?? "";
      if (text) parts.push(text);
      const detectedLocale = p?.textAnnotations?.[0]?.locale;
      if (detectedLocale) langs.add(detectedLocale.toLowerCase());
    }

    const fullText = parts.join("\n\n").trim();
    if (!fullText) {
      throw new OcrError("empty_result", "Vision returned no text", false);
    }

    return {
      text: fullText,
      pages: pages.length,
      confidence: null, // Vision doesn't return aggregate confidence
      languages: Array.from(langs),
    };
  }
}

export const googleVisionProvider = new GoogleVisionProvider();

// ---------------------------------------------------------------------------

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString("base64");
}
