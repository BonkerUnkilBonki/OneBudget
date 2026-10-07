#!/usr/bin/env bash
# Builds OneBudget.apk from the web app + the WebView shell.
# No Gradle: aapt2 + javac + d8 + zipalign + apksigner.
# Env: JDK_BIN, BT (build-tools dir), PLATFORM_JAR, OUT
set -e
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
JDK_BIN="${JDK_BIN:-$(dirname "$(command -v javac)")}"
BT="${BT:-$(dirname "$(command -v aapt2)")}"
PLATFORM_JAR="${PLATFORM_JAR:-/scratch/work/android/android-34/android.jar}"
OUT="${OUT:-$ROOT/OneBudget.apk}"
export PATH="$JDK_BIN:$PATH"
export _JAVA_OPTIONS="-Xmx256m -Xss512k -XX:MaxMetaspaceSize=200m -XX:CompressedClassSpaceSize=32m -XX:ReservedCodeCacheSize=64m -XX:ActiveProcessorCount=1 -XX:ParallelGCThreads=1 -XX:ConcGCThreads=1"

B=build
rm -rf "$B" && mkdir -p "$B/gen" "$B/obj"
rm -rf app/assets/www && mkdir -p app/assets/www
for f in index.html app.js app.css tracker.css oauth-config.js manifest.json sw.js icon.svg ocr.html ocr.js; do
  [ -f "$ROOT/$f" ] && cp "$ROOT/$f" app/assets/www/
done
cp -r "$ROOT/fonts" app/assets/www/
cp -r "$ROOT/vendor" app/assets/www/

echo "[1/6] aapt2 compile"
"$BT/aapt2" compile --dir app/res -o "$B/res.zip"
echo "[2/6] aapt2 link"
"$BT/aapt2" link -o "$B/app.unsigned.apk" -I "$PLATFORM_JAR" \
  --manifest app/AndroidManifest.xml -A app/assets --java "$B/gen" --auto-add-overlay "$B/res.zip"
echo "[3/6] javac"
javac -source 11 -target 11 -nowarn -classpath "$PLATFORM_JAR" \
  -d "$B/obj" "$B/gen/com/onebudget/R.java" $(find app/java -name '*.java') 2>&1 | grep -v 'Picked up' || true
echo "[4/6] d8"
(cd "$B" && "${BT}/d8" --release --lib "$PLATFORM_JAR" --min-api 24 --output . $(find obj -name '*.class'))
echo "[5/6] dex + zipalign"
(cd "$B" && zip -qj app.unsigned.apk classes.dex)
"$BT/zipalign" -f 4 "$B/app.unsigned.apk" "$B/app.aligned.apk"
echo "[6/6] sign"
if [ ! -f debug.keystore ]; then
  keytool -genkeypair -keystore debug.keystore -storepass android -keypass android \
    -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=OneBudget Debug,O=OneBudget,C=IN" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks debug.keystore --ks-pass pass:android --out "$OUT" "$B/app.aligned.apk"
"$BT/apksigner" verify --print-certs "$OUT" | head -2
echo "BUILD OK -> $OUT"
ls -la "$OUT"
