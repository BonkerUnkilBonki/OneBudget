#!/usr/bin/env bash
# Fetches the offline OCR engine (Tesseract.js + wasm core + English data).
# These are third-party binaries and are not stored in the source zip.
set -e
cd "$(dirname "$0")"
curl -sSfL -O https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js
curl -sSfL -O https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js
for f in tesseract-core-simd-lstm.wasm.js tesseract-core-simd-lstm.wasm tesseract-core-lstm.wasm.js tesseract-core-lstm.wasm; do
  curl -sSfL -O "https://unpkg.com/tesseract.js-core@5.1.0/$f"
done
curl -sSfL -o eng.traineddata https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@main/eng.traineddata
echo "OCR engine ready"
