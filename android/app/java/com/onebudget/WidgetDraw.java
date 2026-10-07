package com.onebudget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;

/** Canvas helpers shared by the graphical widgets. */
class WidgetDraw {

    /** A month laid out as a grid of days, shaded by how much was spent. */
    static Bitmap heatmap(int[] vals, int lead, int cols, int cell, int gap, int accent, int track) {
        int rows = (int) Math.ceil((lead + vals.length) / (double) cols);
        int w = cols * cell + (cols - 1) * gap;
        int h = Math.max(cell, rows * cell + (rows - 1) * gap);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        int max = 1;
        for (int v : vals) max = Math.max(max, v);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        int idx = 0;
        for (int i = 0; i < lead + vals.length; i++) {
            int r = i / cols, c = i % cols;
            float l = c * (cell + gap), t = r * (cell + gap);
            if (i < lead) { p.setColor(track); p.setAlpha(45); }
            else {
                int v = vals[idx++];
                if (v <= 0) { p.setColor(track); p.setAlpha(80); }
                else { p.setColor(accent); p.setAlpha((int) (80 + 175 * Math.min(1.0, (double) v / max))); }
            }
            cv.drawRoundRect(new RectF(l, t, l + cell, t + cell), cell * 0.3f, cell * 0.3f, p);
        }
        return bmp;
    }

    /** Bars with a letter under each one — for days of the week. */
    static Bitmap barsLabeled(int[] vals, String[] labels, int w, int h, int accent, int track, int fg) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        int labelH = Math.max(12, (int) (h * 0.22f));
        int chartH = h - labelH - 2;
        int max = 1;
        for (int v : vals) max = Math.max(max, v);
        float bw = (float) w / Math.max(1, vals.length);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        for (int i = 0; i < vals.length; i++) {
            float bh = vals[i] > 0 ? Math.max(6f, (float) vals[i] / max * (chartH - 4)) : 5f;
            p.setColor(vals[i] > 0 ? accent : track);
            cv.drawRoundRect(new RectF(i * bw + bw * 0.24f, chartH - bh, (i + 1) * bw - bw * 0.24f, chartH), 5, 5, p);
        }
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setColor(fg);
        t.setTextSize(labelH * 0.76f);
        t.setTextAlign(Paint.Align.CENTER);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        for (int i = 0; i < labels.length && i < vals.length; i++) {
            cv.drawText(labels[i], i * bw + bw / 2f, h - labelH * 0.2f, t);
        }
        return bmp;
    }

    /** Two bars side by side — this month against last. */
    static Bitmap twoBars(double a, double b, int w, int h, int colorA, int colorB) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        double max = Math.max(1, Math.max(a, b));
        float bw = w * 0.30f, gap = (w - bw * 2) / 3f;
        float ah = (float) (Math.max(0, a) / max * (h - 6)), bh = (float) (Math.max(0, b) / max * (h - 6));
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(colorA);
        cv.drawRoundRect(new RectF(gap, h - ah, gap + bw, h), 9, 9, p);
        p.setColor(colorB);
        cv.drawRoundRect(new RectF(gap * 2 + bw, h - bh, gap * 2 + bw * 2, h), 9, 9, p);
        return bmp;
    }

    /** A progress ring with the figure written in the middle. */
    static Bitmap ring(double value, double max, int size, int accent, int track,
                       String top, String under, int fg, int sub) {
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        float stroke = size * 0.125f;
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(stroke);
        p.setStrokeCap(Paint.Cap.ROUND);
        float inset = stroke / 2f + 1;
        RectF r = new RectF(inset, inset, size - inset, size - inset);
        p.setColor(track);
        cv.drawArc(r, 0, 360, false, p);
        if (value > 0 && max > 0) {
            p.setColor(accent);
            cv.drawArc(r, -90, (float) Math.min(1.0, value / max) * 360f, false, p);
        }
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setTextAlign(Paint.Align.CENTER);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setColor(fg);
        t.setTextSize(size * 0.20f);
        cv.drawText(top, size / 2f, size / 2f + size * 0.04f, t);
        t.setTypeface(Typeface.DEFAULT);
        t.setColor(sub);
        t.setTextSize(size * 0.10f);
        cv.drawText(under, size / 2f, size / 2f + size * 0.21f, t);
        return bmp;
    }

    static int[] ints(org.json.JSONArray a, int n) {
        int[] out = new int[n];
        if (a != null) for (int i = 0; i < n && i < a.length(); i++) out[i] = a.optInt(i, 0);
        return out;
    }

    /** A horizontal share bar. */
    static Bitmap hbar(double pct, int w, int h, int accent, int track) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(track);
        cv.drawRoundRect(new RectF(0, 0, w, h), h / 2f, h / 2f, p);
        double f = Math.max(0, Math.min(1, pct));
        if (f > 0) {
            p.setColor(accent);
            cv.drawRoundRect(new RectF(0, 0, (float) (w * f), h), h / 2f, h / 2f, p);
        }
        return bmp;
    }

    /** A single line across the box. */
    static Bitmap line(int[] v, int w, int h, int accent, int track) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(3f);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setColor(track);
        cv.drawLine(2, h - 4, w - 2, h - 4, p);
        if (v != null && v.length > 1) {
            int max = 1;
            for (int x : v) max = Math.max(max, x);
            android.graphics.Path path = new android.graphics.Path();
            for (int i = 0; i < v.length; i++) {
                float x = (float) i / (v.length - 1) * (w - 4) + 2;
                float y = h - 4 - (float) v[i] / max * (h - 10);
                if (i == 0) path.moveTo(x, y); else path.lineTo(x, y);
            }
            p.setColor(accent);
            cv.drawPath(path, p);
        }
        return bmp;
    }
}
