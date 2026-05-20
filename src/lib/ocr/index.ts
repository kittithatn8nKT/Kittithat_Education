import "server-only";

import { googleVisionProvider } from "./google-vision";
import type { OcrProvider } from "./types";

/** Phase 3 has one provider. Phase 4 may add Tesseract / Typhoon / Azure. */
export function selectProvider(): OcrProvider {
  return googleVisionProvider;
}

export { OcrError } from "./types";
export type { OcrProvider, OcrResult } from "./types";
