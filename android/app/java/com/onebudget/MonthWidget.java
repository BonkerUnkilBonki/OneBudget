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
import android.graphics.Paint;
import android.graphics.RectF;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** The month so far, with a seven-day bar chart drawn into the widget. */
public class MonthWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, MonthWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_month);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#2A2B2D") : Color.parseColor("#EDEDED");

        v.setInt(R.id.mRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.mLabel, j.optString("label", "This month"));
        v.setTextViewText(R.id.mAmount, empty ? "\u2014" : WidgetData.money(j, "month"));
        if (empty) {
            v.setTextViewText(R.id.mSub, "Open OneBudget to set up");
        } else {
            v.setTextViewText(R.id.mSub, "in " + WidgetData.money(j, "income")
                    + "  \u00B7  saved " + WidgetData.money(j, "saved"));
        }
        JSONArray top3 = j.optJSONArray("top3");
        StringBuilder sb = new StringBuilder();
        if (top3 != null) {
            for (int i = 0; i < top3.length(); i++) {
                JSONObject o = top3.optJSONObject(i);
                if (o == null) continue;
                if (sb.length() > 0) sb.append("   ");
                sb.append(o.optString("name")).append(" ").append(WidgetData.money(o, "amt"));
            }
        }
        v.setTextViewText(R.id.mTop, sb.toString());
        v.setTextColor(R.id.mLabel, sub);
        v.setTextColor(R.id.mAmount, accent);
        v.setTextColor(R.id.mSub, sub);
        v.setTextColor(R.id.mTop, sub);

        JSONArray series = j.optJSONArray("series");
        int[] vals = new int[7];
        if (series != null) for (int i = 0; i < Math.min(7, series.length()); i++) vals[i] = series.optInt(i, 0);
        boolean any = false; for (int x : vals) if (x > 0) any = true;
        v.setImageViewBitmap(R.id.mChart, any ? chart(vals, 560, 130, accent, track) : chart(new int[]{0,0,0,0,0,0,0}, 560, 130, track, track));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 30, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.mRoot, pi);
        v.setOnClickPendingIntent(R.id.mChart, pi);
        return v;
    }

    /** Seven bars, newest on the right. */
    static Bitmap chart(int[] vals, int w, int h, int accent, int track) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        int max = 1;
        for (int v : vals) max = Math.max(max, v);
        float bw = (float) w / Math.max(1, vals.length);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(accent);
        for (int i = 0; i < vals.length; i++) {
            float bh = vals[i] > 0 ? Math.max(8f, (float) vals[i] / max * (h - 6)) : 6f;
            p.setColor(vals[i] > 0 ? accent : track);
            float l = i * bw + bw * 0.2f, r = (i + 1) * bw - bw * 0.2f;
            cv.drawRoundRect(new RectF(l, h - bh, r, h), 5, 5, p);
        }
        return bmp;
    }
}
