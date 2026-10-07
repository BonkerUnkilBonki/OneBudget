package com.onebudget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** The last fortnight as a line. */
public class SparkWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, SparkWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_spark);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#3A3B3D") : Color.parseColor("#D8D8D8");

        int[] s14 = WidgetDraw.ints(j.optJSONArray("series14"), 14);
        double total = 0;
        for (int x : s14) total += x;

        v.setInt(R.id.sRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.sLabel, "Last 14 days");
        v.setTextViewText(R.id.sAmount, empty ? "\u2014" : sym(j) + WidgetData.num(total));
        v.setTextViewText(R.id.sSub, empty ? "Open OneBudget to set up"
                : "about " + sym(j) + WidgetData.num(total / 14) + " a day");
        v.setTextColor(R.id.sLabel, sub);
        v.setTextColor(R.id.sAmount, accent);
        v.setTextColor(R.id.sSub, sub);
        v.setImageViewBitmap(R.id.sChart, WidgetDraw.line(s14, 620, 150, accent, track));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 180, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.sRoot, pi);
        v.setOnClickPendingIntent(R.id.sChart, pi);
        return v;
    }

    private static String sym(JSONObject j) { return j.optString("sym", "\u20B9"); }
}
