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

/** Today's spending at a glance, with a one-tap Add. */
public class TodayWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, TodayWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_today);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;

        v.setInt(R.id.tRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));

        v.setTextViewText(R.id.tLabel, "Today");
        v.setTextViewText(R.id.tAmount, empty ? "\u2014" : WidgetData.money(j, "today"));
        int n = j.optInt("todayCount", 0);
        v.setTextViewText(R.id.tSub, empty ? "Open OneBudget to set up"
                : (n == 0 ? "nothing yet" : n + (n == 1 ? " entry" : " entries")));
        v.setTextColor(R.id.tLabel, sub);
        v.setTextColor(R.id.tAmount, accent);
        v.setTextColor(R.id.tSub, sub);

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 10, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.tRoot, pi);
        v.setOnClickPendingIntent(R.id.tAmount, pi);

        Intent add = new Intent(c, MainActivity.class);
        add.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        add.putExtra("action", "add");
        PendingIntent pa = PendingIntent.getActivity(c, 11, add,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.tAdd, pa);
        return v;
    }
}
