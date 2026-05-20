# OCR Processing System

Async, queue-based OCR for uploaded documents. Phase 3 ships with Google Cloud Vision; the provider interface is abstract so Tesseract / Typhoon / Azure can drop in later.

---

## 1. Architecture

```
                  ┌───────────────────┐
   user uploads → │  /documents page  │
                  └─────────┬─────────┘
                            │ Server Action: confirmUpload()
                            ▼
                  ┌───────────────────┐
                  │  documents +      │
                  │  document_versions│   ocr_status = 'pending'
                  └─────────┬─────────┘
                            │ after()  ◄── Next 16 background hook
                            ▼
                  ┌───────────────────┐
                  │ processOcrForVer- │
                  │     sion(id)      │
                  └─────────┬─────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
       claim row      download blob   call Google
   ocr_status =      from Storage     Vision REST
   'processing'                       (image OR PDF)
                                            │
                                            ▼
                            ┌───────────────────────┐
                            │  document_versions    │
                            │  ocr_text = ...       │
                            │  ocr_status =         │
                            │    'completed'/'failed'│
                            └───────────┬───────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │  document_ocr_jobs    │   (audit row per attempt)
                            └───────────────────────┘
```

## 2. Triggers

| Trigger                  | When                                        |
|--------------------------|---------------------------------------------|
| `confirmUpload` → `after()` | After every upload (immediate, in-process) |
| Vercel Cron (vercel.json) | Hourly fallback; picks up `pending` + `failed` |
| Admin "Retry OCR" button | Per-document, resets `failed` → `pending`   |
| `POST /api/jobs/ocr/process` with `OCR_WORKER_SECRET` | Manual / scripted batch |

## 3. State machine

```
                 pending ◄────────────┐
                    │                 │
            claim (transition)        │
                    ▼                 │
                processing            │ retry button
                    │                 │
        ┌───────────┴───────────┐     │
        │                       │     │
        ▼                       ▼     │
    completed               failed ───┘
   (terminal)
                                  
    skipped  (DOCX/XLSX/PPTX — Phase 4 will add real extractors)
   (terminal)
```

The transition `pending → processing` is **atomic** in the worker — it's an `UPDATE document_versions SET ocr_status='processing' WHERE id=$1 AND ocr_status IN ('pending','failed')`. Multiple workers pulling from the same queue can't double-claim.

## 4. Database

| Table                  | Purpose                                          |
|------------------------|--------------------------------------------------|
| `document_versions`    | Current state — `ocr_status`, `ocr_text`, `ocr_attempt`, `ocr_max_attempts`, `ocr_error`, `ocr_completed_at` |
| `document_ocr_jobs`    | One audit row per attempt — provider, latency, characters extracted, error, cost |

Retry cap: `ocr_max_attempts` defaults to 3. After 3 failures the worker stops picking the row up. Admin can still hit Retry to reset `ocr_status='pending'` and try again.

## 5. Google Vision integration

[`src/lib/ocr/google-vision.ts`](../src/lib/ocr/google-vision.ts)

| Input              | Endpoint                            | Feature                  |
|--------------------|-------------------------------------|--------------------------|
| Image (JPG/PNG/…)  | `POST /v1/images:annotate`          | `DOCUMENT_TEXT_DETECTION` |
| PDF (≤ 20 MB)      | `POST /v1/files:annotate`           | `DOCUMENT_TEXT_DETECTION` |

Language hints: `["th", "en"]`. Thai is listed first because Vision's detector sometimes mis-classifies short Thai snippets as Lao/Khmer when English appears first.

Auth: API key (`GOOGLE_VISION_API_KEY`). Scope it to the Vision API in GCP Console.

PDFs larger than 20 MB will throw `OcrError("size_exceeded")` — Phase 4 will route them through Cloud Storage async OCR.

DOCX/XLSX/PPTX/TXT/CSV are marked `skipped` and not retried. Phase 4 will add MIME-specific extractors (mammoth for DOCX, ExcelJS, etc.).

## 6. Setup (one-time)

1. **Enable the Cloud Vision API**
   <https://console.cloud.google.com/apis/library/vision.googleapis.com>

2. **Create an API key**
   APIs & Services → Credentials → Create credentials → API key. Restrict to "Cloud Vision API".

3. **Set Vercel env vars**

   | Name                       | Value                              |
   |----------------------------|------------------------------------|
   | `GOOGLE_VISION_API_KEY`    | the key from step 2                |
   | `SUPABASE_SERVICE_ROLE_KEY`| Supabase Dashboard → Settings → API |
   | `OCR_WORKER_SECRET`        | `openssl rand -hex 32`             |

   Mark them as **Production + Preview + Development**, **Secret**.

4. **Apply migration 0011** in Supabase SQL Editor.

5. **(Optional) Manually trigger a batch**:

   ```
   curl -X POST https://kittithat-education.vercel.app/api/jobs/ocr/process \
     -H "Authorization: Bearer $OCR_WORKER_SECRET"
   ```

## 7. Limits

- Inline file size: **20 MB** (Vision API limit; we enforce in the wrapper)
- Worker batch size: **5** jobs per invocation (configurable in route handler)
- Retry cap: **3** attempts per version
- Vercel Hobby cron: **hourly minimum** (Pro tier can go to every minute)

## 8. Cost ballpark (Google Vision)

| Tier             | First 1,000/mo | Above        |
|------------------|-----------------|--------------|
| DOCUMENT_TEXT_DETECTION | Free       | $1.50 / 1,000 pages |

Each `images:annotate` = 1 page. Each `files:annotate` charges per page extracted. We log the page count in `document_ocr_jobs.pages_processed`, so per-tenant cost can be computed at billing time.
