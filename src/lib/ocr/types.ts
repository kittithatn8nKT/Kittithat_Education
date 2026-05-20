// Provider-agnostic OCR types. Phase 3 ships Google Vision; the interface
// is deliberately narrow so we can drop in Tesseract / Typhoon / Azure
// in Phase 4 without touching the calling code.

export interface OcrResult {
  /** Concatenated text across all pages. */
  text: string;
  /** Number of pages processed (1 for an image, N for PDFs). */
  pages: number;
  /** 0–1 confidence as reported by the provider, if available. */
  confidence: number | null;
  /** ISO-639-1 language codes detected (e.g. ['th','en']). */
  languages: string[];
  /** Provider-specific raw payload, kept for debugging. */
  raw?: unknown;
}

export class OcrError extends Error {
  constructor(
    public code:
      | "unsupported_mime"
      | "file_download_failed"
      | "provider_unauthorized"
      | "provider_rate_limited"
      | "provider_error"
      | "empty_result"
      | "no_api_key"
      | "size_exceeded",
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "OcrError";
  }
}

export interface OcrProvider {
  name: string;
  /** Whether the provider can handle this mime type. */
  supports(mimeType: string): boolean;
  /** Extract text from a Blob. Throws OcrError on failure. */
  extract(file: Blob, mimeType: string): Promise<OcrResult>;
}
