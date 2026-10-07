/* OneBudget — full offline cache for the hosted web version.
   The Android app ships its files inside the APK and does not need this.
   The app shell is precached so it opens with no network at all; the OCR
   engine is cached the first time a bill is scanned, which keeps the first
   load light while still leaving it fully offline afterwards. */
const CACHE = 'onebudget-v3';
const SHELL = ['./', 'index.html', 'app.css', 'tracker.css', 'app.js', 'ocr.html', 'ocr.js',
  'oauth-config.js', 'manifest.json', 'icon.svg', 'fonts/OneGitSans.ttf',
  'vendor/tesseract.min.js', 'vendor/worker.min.js',
  'vendor/tesseract-core-lstm.wasm.js', 'vendor/tesseract-core-simd-lstm.wasm.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   /* never touch the GitHub API or a model endpoint */
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
