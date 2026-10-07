package com.onebudget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.Path;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** How this month is pacing against the last one, drawn as two lines. */
public class TrendWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, TrendWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_trend);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#4A4A4A") : Color.parseColor("#C8C8C8");

        v.setInt(R.id.tRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.tLabel, "Pace this month");
        v.setTextViewText(R.id.tAmount, empty ? "\u2014" : WidgetData.money(j, "month"));
        int dom = j.optInt("dom", 0), dim = j.optInt("dim", 30);
        v.setTextViewText(R.id.tSub, empty ? "Open OneBudget to set up" : "day " + dom + " of " + dim);
        v.setTextColor(R.id.tLabel, sub);
        v.setTextColor(R.id.tAmount, accent);
        v.setTextColor(R.id.tSub, sub);

        int[] now = arr(j.optJSONArray("pace"));
        int[] before = arr(j.optJSONArray("pacePrev"));
        v.setImageViewBitmap(R.id.tChart, line(now, before, 560, 150, accent, track));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 50, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.tRoot, pi);
        v.setOnClickPendingIntent(R.id.tChart, pi);
        return v;
    }

    private static int[] arr(JSONArray a) {
        if (a == null) return new int[0];
        int[] out = new int[a.length()];
        for (int i = 0; i < a.length(); i++) out[i] = a.optInt(i, 0);
        return out;
    }

    /** This month solid, last month dashed behind it. */
    static Bitmap line(int[] now, int[] before, int w, int h, int accent, int track) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        int max = 1;
        for (int x : now) max = Math.max(max, x);
        for (int x : before) max = Math.max(max, x);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(3.5f);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setColor(track);
        p.setPathEffect(new DashPathEffect(new float[]{ 7, 7 }, 0));
        cv.drawPath(path(before, w, h, max), p);
        p.setPathEffect(null);
        p.setColor(accent);
        cv.drawPath(path(now, w, h, max), p);
        return bmp;
    }

    private static Path path(int[] v, int w, int h, int max) {
        Path path = new Path();
        if (v.length < 2) return path;
        for (int i = 0; i < v.length; i++) {
            float x = (float) i / (v.length - 1) * (w - 4) + 2;
            float y = h - 4 - (float) v[i] / max * (h - 10);
            if (i == 0) path.moveTo(x, y); else path.lineTo(x, y);
        }
        return path;
    }
}
