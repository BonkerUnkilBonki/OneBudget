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

/** Today's spending as a ring against your usual day. */
public class RingWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, RingWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_ring);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#2A2B2D") : Color.parseColor("#EDEDED");

        v.setInt(R.id.gRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.gLabel, "Today");

        double today = j.optDouble("today", 0), avg = j.optDouble("avg", 0);
        int pct = avg > 0 ? (int) Math.round(today / avg * 100) : 0;
        v.setImageViewBitmap(R.id.gRing, WidgetDraw.ring(today, avg > 0 ? avg : Math.max(1, today),
                300, accent, track, empty ? "\u2014" : WidgetData.moneyShort(j, "today"),
                avg > 0 ? pct + "% of usual" : "today", fg, sub));

        String legend;
        if (empty) legend = "Open OneBudget to set up";
        else if (avg <= 0) legend = "no average yet";
        else if (today > avg * 1.5) legend = "well above your " + WidgetData.money(j, "avg") + " day";
        else if (today > avg) legend = "a little above usual";
        else legend = "under your usual " + WidgetData.money(j, "avg");
        v.setTextViewText(R.id.gLegend, legend);
        v.setTextColor(R.id.gLabel, sub);
        v.setTextColor(R.id.gLegend, fg);

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 140, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.gRoot, pi);
        v.setOnClickPendingIntent(R.id.gRing, pi);
        return v;
    }
}
