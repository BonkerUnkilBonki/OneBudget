package com.onebudget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** This week's spending with the seven daily bars underneath. */
public class WeekWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, WeekWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_week);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#2A2B2D") : Color.parseColor("#EDEDED");

        v.setInt(R.id.wRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.wLabel, "This week");
        v.setTextViewText(R.id.wAmount, empty ? "\u2014" : WidgetData.money(j, "week"));
        if (empty) {
            v.setTextViewText(R.id.wSub, "Open OneBudget to set up");
        } else {
            double now = j.optDouble("week", 0), before = j.optDouble("lastWeek", 0);
            if (before <= 0) v.setTextViewText(R.id.wSub, "no spending last week");
            else {
                int pct = (int) Math.round((now - before) / before * 100);
                v.setTextViewText(R.id.wSub, (pct >= 0 ? "\u2191 " : "\u2193 ") + Math.abs(pct)
                        + "%  vs last week");
            }
        }
        v.setTextColor(R.id.wLabel, sub);
        v.setTextColor(R.id.wAmount, accent);
        v.setTextColor(R.id.wSub, sub);

        JSONArray series = j.optJSONArray("series");
        int[] vals = new int[7];
        if (series != null) for (int i = 0; i < Math.min(7, series.length()); i++) vals[i] = series.optInt(i, 0);
        boolean any = false; for (int x : vals) if (x > 0) any = true;
        v.setImageViewBitmap(R.id.wChart, MonthWidget.chart(any ? vals : new int[]{0,0,0,0,0,0,0},
                560, 150, any ? accent : track, track));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 40, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.wRoot, pi);
        v.setOnClickPendingIntent(R.id.wChart, pi);
        return v;
    }
}
