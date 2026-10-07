package com.onebudget;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.util.Base64;
import android.window.OnBackInvokedDispatcher;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * OneBudget — expense & budget tracker.
 *
 * A thin WebView host around the bundled web app in assets/www. The app is
 * local-first: it works with no account at all. The bridge below only adds
 * the few things a page cannot do by itself — theming the system bars,
 * the native clipboard, saving a backup file to Downloads, and GitHub's
 * OAuth device flow (used only if the user opts into backup/sync).
 */
public class MainActivity extends Activity {

    private static final String DEFAULT_URL = "file:///android_asset/www/index.html";
    private static final int FILE_REQ = 4711;
    private static final int CAM_REQ = 4712;
    private static final int PICK_REQ = 4713;
    private static final int MIC_REQ = 7;
    private static final int STORE_REQ = 8;
    /* the OCR page is served from a virtual https origin so the recognition
       engine can spawn its worker and load its wasm + language data offline */
    private static final String VHOST = "appassets.androidplatform.net";
    private static final String OCR_URL = "https://" + VHOST + "/ocr.html";

    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private SpeechRecognizer sr;
    private boolean pendingListen = false;
    private WebView ocrView;
    private boolean ocrLoaded = false;
    private String ocrPending;
    private Uri photoUri;
    private boolean pendingCamera = false;
    private String pendingAction;   // set when a widget deep-links into the app

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        web.setBackgroundColor(Color.parseColor("#F2F2F2"));

        web.addJavascriptInterface(new Native(), "OneBudget");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Select a backup file"), FILE_REQ);
                } catch (Exception e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }
        });

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                deliverPendingAction();
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                // web links (creating a token, github.com/login/device) go to the browser;
                // the app itself stays on its own file:// page
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                    return true;
                }
                return false;
            }
        });

        android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.addView(web, new android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        readIntentAction(getIntent());
        web.loadUrl(DEFAULT_URL);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == CAM_REQ) {
            Uri u = photoUri;
            photoUri = null;
            if (res == RESULT_OK && u != null) handOverImage(u);
            else evalJs("window.__bill && __bill(false," + org.json.JSONObject.quote("No photo was taken.") + ")");
            return;
        }
        if (req == PICK_REQ) {
            if (res == RESULT_OK && data != null && data.getData() != null) handOverImage(data.getData());
            else evalJs("window.__bill && __bill(false," + org.json.JSONObject.quote("No image was picked.") + ")");
            return;
        }
        if (req == FILE_REQ) {
            Uri[] out = null;
            if (res == RESULT_OK && data != null) {
                if (data.getData() != null) out = new Uri[]{ data.getData() };
                else if (data.getClipData() != null) {
                    ClipData c = data.getClipData();
                    out = new Uri[c.getItemCount()];
                    for (int i = 0; i < c.getItemCount(); i++) out[i] = c.getItemAt(i).getUri();
                }
            }
            if (fileCb != null) { fileCb.onReceiveValue(out); fileCb = null; }
            return;
        }
        super.onActivityResult(req, res, data);
    }

    private void evalJs(final String js) {
        web.post(new Runnable() { @Override public void run() { try { web.evaluateJavascript(js, null); } catch (Exception ignored) { } } });
    }

    private static String errText(Throwable e) {
        String m = e.getMessage();
        if (m == null || m.isEmpty()) m = e.getClass().getSimpleName();
        return m.length() > 200 ? m.substring(0, 200) : m;
    }

    private void deliverPendingAction() {
        final String a = pendingAction;
        pendingAction = null;
        if (a == null) return;
        if (a.startsWith("cat:")) {
            final String id = a.substring(4);
            web.postDelayed(new Runnable() { @Override public void run() {
                evalJs("window.__quickCat && window.__quickCat(" + org.json.JSONObject.quote(id) + ")");
            }}, 350);
        } else if ("add".equals(a)) {
            web.postDelayed(new Runnable() { @Override public void run() {
                evalJs("window.__quickAdd && window.__quickAdd()");
            }}, 350);
        } else if ("quickadd".equals(a)) {
            web.postDelayed(new Runnable() { @Override public void run() {
                evalJs("window.__quickPicker && window.__quickPicker()");
            }}, 350);
        } else if ("speak".equals(a)) {
            web.postDelayed(new Runnable() { @Override public void run() {
                evalJs("window.__quickSpeak && window.__quickSpeak()");
            }}, 350);
        } else if ("scan".equals(a)) {
            web.postDelayed(new Runnable() { @Override public void run() {
                evalJs("window.__quickScan && window.__quickScan()");
            }}, 350);
        } else if ("today".equals(a)) {
            web.postDelayed(new Runnable() { @Override public void run() {
                evalJs("window.__go && window.__go('#/today')");
            }}, 350);
        } else if ("bills".equals(a)) {
            web.postDelayed(new Runnable() { @Override public void run() {
                evalJs("window.__go && window.__go('#/recurring')");
            }}, 350);
        }
    }

    private void readIntentAction(Intent i) {
        if (i == null) return;
        String q = i.getStringExtra("quickcat");
        String act = i.getStringExtra("action");
        if (q != null && q.length() > 0) pendingAction = "cat:" + q;
        else if ("add".equals(act)) pendingAction = "add";
        else if ("quickadd".equals(act)) pendingAction = "quickadd";
        else if ("speak".equals(act)) pendingAction = "speak";
        else if ("scan".equals(act)) pendingAction = "scan";
        else if ("bills".equals(act)) pendingAction = "bills";
        else if ("today".equals(act)) pendingAction = "today";
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        readIntentAction(i);
        deliverPendingAction();
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshWidgets();
    }

    /** Repaint every placed widget from the cached summary. */
    private void refreshWidgets() {
        try { SpendWidget.updateAll(this); } catch (Throwable ignored) { }
        try { TodayWidget.updateAll(this); } catch (Throwable ignored) { }
        try { QuickAddWidget.updateAll(this); } catch (Throwable ignored) { }
        try { MonthWidget.updateAll(this); } catch (Throwable ignored) { }
        try { WeekWidget.updateAll(this); } catch (Throwable ignored) { }
        try { DonutWidget.updateAll(this); } catch (Throwable ignored) { }
        try { TrendWidget.updateAll(this); } catch (Throwable ignored) { }
        try { CaptureWidget.updateAll(this); } catch (Throwable ignored) { }
        try { AddWidget.updateAll(this); } catch (Throwable ignored) { }
        try { RecentWidget.updateAll(this); } catch (Throwable ignored) { }
        try { YearWidget.updateAll(this); } catch (Throwable ignored) { }
        try { HeatmapWidget.updateAll(this); } catch (Throwable ignored) { }
        try { WeekdayWidget.updateAll(this); } catch (Throwable ignored) { }
        try { CompareWidget.updateAll(this); } catch (Throwable ignored) { }
        try { RingWidget.updateAll(this); } catch (Throwable ignored) { }
        try { NetWorthWidget.updateAll(this); } catch (Throwable ignored) { }
        try { IncomeWidget.updateAll(this); } catch (Throwable ignored) { }
        try { BillsWidget.updateAll(this); } catch (Throwable ignored) { }
        try { SparkWidget.updateAll(this); } catch (Throwable ignored) { }
        try { TopCatWidget.updateAll(this); } catch (Throwable ignored) { }
    }

    /* ================= bill OCR ================= */

    private void ensureOcrView() {
        if (ocrView != null) return;
        ocrView = new WebView(this);
        WebSettings s = ocrView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        ocrView.addJavascriptInterface(new OcrBridge(), "OneBudget");
        ocrView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                WebResourceResponse r = serveAsset(req.getUrl());
                return r != null ? r : super.shouldInterceptRequest(v, req);
            }
            @Override
            public void onPageFinished(WebView v, String url) {
                ocrLoaded = true;
                if (ocrPending != null) pushToOcr();
            }
        });
        /* kept in the view tree at 1x1 and invisible: an unattached WebView can
           have its JavaScript throttled */
        android.widget.FrameLayout root = (android.widget.FrameLayout) web.getParent();
        if (root != null) {
            android.widget.FrameLayout.LayoutParams lp =
                    new android.widget.FrameLayout.LayoutParams(1, 1);
            root.addView(ocrView, lp);
        }
    }

    private void pushToOcr() {
        final String data = ocrPending;
        ocrPending = null;
        if (data == null || ocrView == null) return;
        ocrView.evaluateJavascript(
                "window.__ocrDone=function(ok,t){OneBudget._ocrDone(ok,t);};window.runOcr("
                        + org.json.JSONObject.quote(data) + ");", null);
    }

    /** Serves the bundled web assets from https://<VHOST>/... */
    private WebResourceResponse serveAsset(Uri url) {
        if (url == null || !VHOST.equals(url.getHost())) return null;
        String path = url.getPath();
        if (path == null || path.isEmpty() || "/".equals(path)) path = "/ocr.html";
        if (path.startsWith("/")) path = path.substring(1);
        try {
            InputStream in = getAssets().open("www/" + path);
            Map<String, String> h = new HashMap<>();
            h.put("Access-Control-Allow-Origin", "*");
            h.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mimeOf(path), null, 200, "OK", h, in);
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null,
                    new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mimeOf(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".wasm")) return "application/wasm";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    /** Bridge for the hidden OCR page. */
    private class OcrBridge {
        @JavascriptInterface
        public void _ocrDone(final boolean ok, final String text) {
            evalJs("window.__ocr && __ocr(" + ok + ","
                    + org.json.JSONObject.quote(text == null ? "" : text) + ")");
        }
    }

    /* ================= camera + gallery ================= */

    private void startCamera() {
        try {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Images.Media.DISPLAY_NAME, "onebudget_scan_" + System.currentTimeMillis() + ".jpg");
            cv.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            photoUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
            if (photoUri == null) throw new IllegalStateException("no writable image location");
            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            i.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
            i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(i, CAM_REQ);
        } catch (Exception e) {
            photoUri = null;
            evalJs("window.__bill && __bill(false," + org.json.JSONObject.quote("Could not open the camera.") + ")");
        }
    }

    private void startGallery() {
        try {
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.setType("image/*");
            i.addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(Intent.createChooser(i, "Pick a bill or screenshot"), PICK_REQ);
        } catch (Exception e) {
            evalJs("window.__bill && __bill(false," + org.json.JSONObject.quote("No image picker available.") + ")");
        }
    }

    /** Downscales a photo and hands it to the page as a data URL. */
    private void handOverImage(Uri uri) {
        new Thread(new Runnable() { @Override public void run() {
            String data = null, err = null;
            try { data = uriToDataUrl(uri); } catch (Exception e) { err = errText(e); }
            final String d = data, e2 = err;
            runOnUiThread(new Runnable() { @Override public void run() {
                if (d == null) evalJs("window.__bill && __bill(false," + org.json.JSONObject.quote(e2) + ")");
                else evalJs("window.__bill && __bill(true," + org.json.JSONObject.quote(d) + ")");
            }});
        }}).start();
    }

    private String uriToDataUrl(Uri uri) throws Exception {
        if (uri == null) throw new Exception("No image was returned");
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        InputStream in = getContentResolver().openInputStream(uri);
        BitmapFactory.decodeStream(in, null, bounds);
        if (in != null) in.close();
        int max = 1700, scale = 1;
        while (bounds.outWidth / scale > max || bounds.outHeight / scale > max) scale *= 2;
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inSampleSize = scale;
        in = getContentResolver().openInputStream(uri);
        Bitmap bmp = BitmapFactory.decodeStream(in, null, opts);
        if (in != null) in.close();
        if (bmp == null) throw new Exception("Could not read that image");
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.JPEG, 84, bo);
        bmp.recycle();
        return "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
    }

    /* ================= microphone ================= */

    private void startListening() {
        try {
            if (sr != null) { try { sr.destroy(); } catch (Throwable ignored) { } sr = null; }
            if (!SpeechRecognizer.isRecognitionAvailable(this)) {
                evalJs("window.__voice && __voice(false," + org.json.JSONObject.quote("No speech service on this device.") + ")");
                return;
            }
            sr = SpeechRecognizer.createSpeechRecognizer(this);
            sr.setRecognitionListener(new RecognitionListener() {
                public void onReadyForSpeech(Bundle b) { }
                public void onBeginningOfSpeech() { }
                public void onRmsChanged(float v) { }
                public void onBufferReceived(byte[] b) { }
                public void onEndOfSpeech() { }
                public void onPartialResults(Bundle b) { }
                public void onEvent(int t, Bundle b) { }
                public void onResults(Bundle b) {
                    String text = "";
                    java.util.ArrayList<String> list = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (list != null && !list.isEmpty()) text = list.get(0);
                    evalJs("window.__voice && __voice(true," + org.json.JSONObject.quote(text) + ")");
                }
                public void onError(int code) {
                    evalJs("window.__voice && __voice(false," + org.json.JSONObject.quote(voiceErr(code)) + ")");
                }
            });
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Say the expense");
            /* ask for the on-device recogniser so this keeps working with no
               network, the same way the bill reader does */
            i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            sr.startListening(i);
        } catch (Throwable e) {
            evalJs("window.__voice && __voice(false," + org.json.JSONObject.quote("Microphone unavailable on this device.") + ")");
        }
    }

    private static String voiceErr(int code) {
        switch (code) {
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "Did not catch that \u2014 tap the mic and try again.";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "This device has no offline speech model installed. Type it or scan the bill instead \u2014 both work without a network.";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "Microphone permission is off.";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "The microphone is busy. Try again.";
            default:
                return "Could not hear anything. Try again.";
        }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req == STORE_REQ) {
            boolean ok = res != null && res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
            if (ok && pendingCamera) { pendingCamera = false; startCamera(); }
            else if (!ok) { pendingCamera = false; startGallery(); }   // picking needs no permission
            return;
        }
        if (req == MIC_REQ) {
            boolean ok = res != null && res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
            if (ok && pendingListen) { pendingListen = false; startListening(); }
            else if (!ok) evalJs("window.__voice && __voice(false," + org.json.JSONObject.quote("Microphone permission was denied.") + ")");
            return;
        }
        super.onRequestPermissionsResult(req, perms, res);
    }

    /* The back gesture, the hardware key and the three-button nav bar all end
       up here. The web app decides: close an open panel, then return to Home,
       and only then does Android leave the app. */
    private void handleBack() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("(window.__onBack && window.__onBack()) ? '1' : '0'", value -> {
            if (value == null || !value.contains("1")) finish();
        });
    }

    @Override
    public void onBackPressed() {
        handleBack();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    /* ================= native bridge ================= */
    private class Native {

        /** Restyle the Android status/navigation bars to match the app theme. */
        @JavascriptInterface
        public void theme(final String barColor, final boolean lightIcons) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    try {
                        int c = Color.parseColor(barColor);
                        getWindow().setStatusBarColor(c);
                        getWindow().setNavigationBarColor(c);
                        web.setBackgroundColor(c);
                        if (Build.VERSION.SDK_INT >= 23) {
                            View d = getWindow().getDecorView();
                            int f = d.getSystemUiVisibility();
                            if (lightIcons) f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            else f &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            if (Build.VERSION.SDK_INT >= 26) {
                                if (lightIcons) f |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                                else f &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                            }
                            d.setSystemUiVisibility(f);
                        }
                    } catch (Exception ignored) { }
                }
            });
        }

        @JavascriptInterface
        public String appVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) { return ""; }
        }

        /** Starts a one-shot voice capture; the result comes back on window.__voice. */
        @JavascriptInterface
        public void listen() {
            runOnUiThread(new Runnable() { @Override public void run() {
                if (Build.VERSION.SDK_INT >= 23 &&
                        checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    pendingListen = true;
                    requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO }, MIC_REQ);
                    return;
                }
                startListening();
            }});
        }

        /** Opens the camera to photograph a bill. The photo comes back on window.__bill. */
        @JavascriptInterface
        public void scanBill() {
            runOnUiThread(new Runnable() { @Override public void run() {
                if (Build.VERSION.SDK_INT < 29 && Build.VERSION.SDK_INT >= 23 &&
                        checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    pendingCamera = true;
                    requestPermissions(new String[]{ Manifest.permission.WRITE_EXTERNAL_STORAGE }, STORE_REQ);
                    return;
                }
                startCamera();
            }});
        }

        /** Picks an existing bill photo or payment screenshot. */
        @JavascriptInterface
        public void pickBill() {
            runOnUiThread(new Runnable() { @Override public void run() { startGallery(); } });
        }

        /** Runs on-device OCR over a data URL; the text comes back on window.__ocr. */
        @JavascriptInterface
        public void ocr(final String dataUrl) {
            runOnUiThread(new Runnable() { @Override public void run() {
                try {
                    ensureOcrView();
                    ocrPending = dataUrl;
                    if (ocrLoaded) pushToOcr();
                    else ocrView.loadUrl(OCR_URL);
                } catch (Throwable e) {
                    evalJs("window.__ocr && __ocr(false," + org.json.JSONObject.quote("Could not start the text reader.") + ")");
                }
            }});
        }

        /** Receives the summary the widget should show, and repaints the widgets. */
        @JavascriptInterface
        public void widgetSync(final String json) {
            try {
                getSharedPreferences("onebudget", MODE_PRIVATE).edit()
                        .putString("widget", json == null ? "" : json).apply();
            } catch (Throwable ignored) { }
            runOnUiThread(new Runnable() { @Override public void run() { refreshWidgets(); } });
        }

        /** Native clipboard — more reliable than the web clipboard API here. */
        @JavascriptInterface
        public void copy(final String text) {
            try {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("OneBudget", text));
            } catch (Exception ignored) { }
        }

        /** Saves a text file (a backup) into the Downloads folder. */
        @JavascriptInterface
        public void saveFile(final String name, final String content) {
            final String safe = (name == null || name.isEmpty() ? "onebudget-backup.json" : name)
                    .replaceAll("[^A-Za-z0-9 ._()-]", "_");
            new Thread(new Runnable() { @Override public void run() {
                try {
                    byte[] data = (content == null ? "" : content).getBytes("UTF-8");
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                        cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        if (uri == null) throw new IllegalStateException("could not create the file");
                        OutputStream out = getContentResolver().openOutputStream(uri);
                        out.write(data);
                        out.close();
                    } else {
                        java.io.File f = new java.io.File(getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS), safe);
                        java.io.FileOutputStream fo = new java.io.FileOutputStream(f);
                        fo.write(data);
                        fo.close();
                    }
                    evalJs("window.toast&&toast('Backup saved to Downloads')");
                } catch (Exception e) {
                    evalJs("window.toast&&toast('Could not save - " + errText(e) + "')");
                }
            }}).start();
        }

        /** When this build was installed — any release published after this counts as newer. */
        @JavascriptInterface
        public String appInstallTime() {
            try {
                android.content.pm.PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
                long t = pi.lastUpdateTime > 0 ? pi.lastUpdateTime : pi.firstInstallTime;
                return String.valueOf(t);
            } catch (Exception e) { return "0"; }
        }

        /** Downloads a file (an update APK) into Downloads, then offers to install it. */
        @JavascriptInterface
        public void download(final String url, final String name) {
            final String safe = (name == null || name.isEmpty() ? "onebudget-update.apk" : name)
                    .replaceAll("[^A-Za-z0-9 ._()-]", "_");
            new Thread(new Runnable() { @Override public void run() {
                try {
                    java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                    c.setInstanceFollowRedirects(true);
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(60000);
                    c.connect();
                    if (c.getResponseCode() >= 400) throw new IllegalStateException("HTTP " + c.getResponseCode());
                    InputStream in = c.getInputStream();
                    Uri uri = null;
                    OutputStream out;
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                        cv.put(MediaStore.Downloads.MIME_TYPE, "application/vnd.android.package-archive");
                        uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        if (uri == null) throw new IllegalStateException("could not create the file");
                        out = getContentResolver().openOutputStream(uri);
                    } else {
                        java.io.File f = new java.io.File(getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS), safe);
                        out = new java.io.FileOutputStream(f);
                    }
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    out.close(); in.close();
                    final Uri furi = uri;
                    final boolean ok = true;
                    runOnUiThread(new Runnable() { @Override public void run() {
                        evalJs("window.__updateDownloaded&&window.__updateDownloaded(true," + org.json.JSONObject.quote(safe) + ")");
                        if (furi != null) { try { installApk(furi); } catch (Throwable ignored) { } }
                    }});
                } catch (final Exception e) {
                    final String msg = errText(e);
                    runOnUiThread(new Runnable() { @Override public void run() {
                        evalJs("window.__updateDownloaded&&window.__updateDownloaded(false," + org.json.JSONObject.quote(msg) + ")");
                    }});
                }
            }}).start();
        }

        private void installApk(Uri uri) {
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        }

        /** Opens a link in the browser (the release page). */
        @JavascriptInterface
        public void openUrl(final String url) {
            if (url == null || !url.startsWith("http")) return;
            runOnUiThread(new Runnable() { @Override public void run() {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                } catch (Throwable ignored) { }
            }});
        }

        /** GitHub OAuth device flow, step 1: ask GitHub for a user code. */
        @JavascriptInterface
        public void oauthStart(final String clientId, final String scope) {
            new Thread(new Runnable() { @Override public void run() {
                try {
                    String b = "client_id=" + java.net.URLEncoder.encode(clientId == null ? "" : clientId, "UTF-8") +
                            "&scope=" + java.net.URLEncoder.encode(scope == null ? "" : scope, "UTF-8");
                    String resp = post("https://github.com/login/device/code", b);
                    evalJs("window.__oauthStart&&__oauthStart(true," + org.json.JSONObject.quote(resp) + ")");
                } catch (Exception e) {
                    evalJs("window.__oauthStart&&__oauthStart(false," + org.json.JSONObject.quote(errText(e)) + ")");
                }
            }}).start();
        }

        /** GitHub OAuth device flow, step 2: poll once for the token. */
        @JavascriptInterface
        public void oauthPoll(final String clientId, final String deviceCode) {
            new Thread(new Runnable() { @Override public void run() {
                try {
                    String b = "client_id=" + java.net.URLEncoder.encode(clientId == null ? "" : clientId, "UTF-8") +
                            "&device_code=" + java.net.URLEncoder.encode(deviceCode == null ? "" : deviceCode, "UTF-8") +
                            "&grant_type=" + java.net.URLEncoder.encode("urn:ietf:params:oauth:grant-type:device_code", "UTF-8");
                    String resp = post("https://github.com/login/oauth/access_token", b);
                    evalJs("window.__oauthPoll&&__oauthPoll(true," + org.json.JSONObject.quote(resp) + ")");
                } catch (Exception e) {
                    evalJs("window.__oauthPoll&&__oauthPoll(false," + org.json.JSONObject.quote(errText(e)) + ")");
                }
            }}).start();
        }

        private String post(String urlS, String body) throws Exception {
            java.net.URL u = new java.net.URL(urlS);
            javax.net.ssl.HttpsURLConnection c = (javax.net.ssl.HttpsURLConnection) u.openConnection();
            c.setRequestMethod("POST");
            c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            c.setRequestProperty("Accept", "application/json");
            c.setRequestProperty("User-Agent", "OneBudget");
            c.setDoOutput(true);
            c.setConnectTimeout(15000);
            c.setReadTimeout(20000);
            OutputStream os = c.getOutputStream();
            os.write(body.getBytes("UTF-8"));
            os.close();
            int code = c.getResponseCode();
            InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
            java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int r;
            while ((r = in.read(buf)) > 0) bo.write(buf, 0, r);
            in.close();
            if (code != 200) throw new Exception("HTTP " + code);
            return bo.toString("UTF-8");
        }
    }
}
