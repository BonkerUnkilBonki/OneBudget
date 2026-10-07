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
import android.graphics.Typeface;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** This month's spending as a ring, one arc per category. */
public class DonutWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, DonutWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_donut);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#2A2B2D") : Color.parseColor("#EDEDED");

        v.setInt(R.id.dRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.dLabel, "By category");

        JSONArray cats = j.optJSONArray("cats5");
        String centre = empty ? "\u2014" : WidgetData.moneyShort(j, "month");
        v.setImageViewBitmap(R.id.dRing, donut(cats, centre, "this month", 300, track, fg, sub));

        StringBuilder sb = new StringBuilder();
        if (cats != null) {
            for (int i = 0; i < Math.min(3, cats.length()); i++) {
                JSONObject o = cats.optJSONObject(i);
                if (o == null) continue;
                if (sb.length() > 0) sb.append("   ");
                sb.append(o.optString("name")).append(" ").append(WidgetData.money(o, "amt"));
            }
        }
        v.setTextViewText(R.id.dLegend, empty ? "Open OneBudget to set up" : sb.toString());
        v.setTextColor(R.id.dLabel, sub);
        v.setTextColor(R.id.dLegend, fg);

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 60, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.dRoot, pi);
        v.setOnClickPendingIntent(R.id.dRing, pi);
        return v;
    }

    /** One arc per category, the month's total written in the middle. */
    static Bitmap donut(JSONArray cats, String top, String under, int size, int track, int fg, int sub) {
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        float stroke = size * 0.21f;
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(stroke);
        float inset = stroke / 2f + 2;
        RectF r = new RectF(inset, inset, size - inset, size - inset);
        p.setColor(track);
        cv.drawArc(r, 0, 360, false, p);

        double sum = 0;
        if (cats != null) for (int i = 0; i < cats.length(); i++) {
            JSONObject o = cats.optJSONObject(i);
            if (o != null) sum += o.optDouble("amt", 0);
        }
        if (sum > 0 && cats != null) {
            float start = -90f;
            for (int i = 0; i < cats.length(); i++) {
                JSONObject o = cats.optJSONObject(i);
                if (o == null) continue;
                double amt = o.optDouble("amt", 0);
                if (amt <= 0) continue;
                float sweep = (float) (amt / sum * 360.0);
                p.setColor(WidgetData.color(o.optString("color", "#1B6EF3"), Color.parseColor("#1B6EF3")));
                cv.drawArc(r, start, sweep, false, p);
                start += sweep;
            }
        }
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setTextAlign(Paint.Align.CENTER);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setColor(fg);
        t.setTextSize(size * 0.155f);
        cv.drawText(top, size / 2f, size / 2f + size * 0.03f, t);
        t.setTypeface(Typeface.DEFAULT);
        t.setColor(sub);
        t.setTextSize(size * 0.10f);
        cv.drawText(under, size / 2f, size / 2f + size * 0.20f, t);
        return bmp;
    }
}
