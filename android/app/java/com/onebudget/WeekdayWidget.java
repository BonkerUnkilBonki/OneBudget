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

/** Your average spending on each day of the week. */
public class WeekdayWidget extends AppWidgetProvider {

    private static final String[] DAYS = { "M", "T", "W", "T", "F", "S", "S" };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, WeekdayWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_weekday);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#2A2B2D") : Color.parseColor("#EDEDED");

        v.setInt(R.id.kRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.kLabel, "By weekday");
        v.setTextColor(R.id.kLabel, sub);

        int[] wd = WidgetDraw.ints(j.optJSONArray("weekday"), 7);
        int hi = 0;
        for (int i = 1; i < 7; i++) if (wd[i] > wd[hi]) hi = i;
        v.setTextViewText(R.id.kAmount, empty ? "\u2014" : WidgetData.money(j, "avg"));
        v.setTextViewText(R.id.kSub, empty ? "Open OneBudget to set up"
                : "most on " + new String[]{"Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays","Sundays"}[hi]);
        v.setTextColor(R.id.kAmount, accent);
        v.setTextColor(R.id.kSub, sub);
        v.setImageViewBitmap(R.id.kChart, WidgetDraw.barsLabeled(wd, DAYS, 620, 190, accent, track, sub));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 120, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.kRoot, pi);
        v.setOnClickPendingIntent(R.id.kChart, pi);
        return v;
    }
}
