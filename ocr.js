/* OneBudget — on-device bill OCR.
   Everything (engine, wasm core, English data) is bundled in the app, so this
   works with no network at all. The page is driven by the native side:
   runOcr(dataUrl) -> window.__ocrDone(ok, text)                        */
let OCR_WORKER = null;
let OCR_READY = null;

function ocrWorker() {
  if (OCR_READY) return OCR_READY;
  OCR_READY = (async () => {
    OCR_WORKER = await Tesseract.createWorker('eng', 1, {
      workerPath: 'vendor/worker.min.js',
      corePath: 'vendor/',
      langPath: 'vendor/',
      gzip: false,
    });
    return OCR_WORKER;
  })();
  return OCR_READY;
}

window.ocrWarm = async function () {
  try { await ocrWorker(); window.__ocrWarm && window.__ocrWarm(true); }
  catch (e) { window.__ocrWarm && window.__ocrWarm(false, String((e && e.message) || e)); }
};

window.runOcr = async function (dataUrl) {
  try {
    const w = await ocrWorker();
    const res = await w.recognize(dataUrl);
    const text = (res && res.data && res.data.text) || '';
    window.__ocrDone && window.__ocrDone(true, text);
  } catch (e) {
    window.__ocrDone && window.__ocrDone(false, String((e && e.message) || e));
  }
};
