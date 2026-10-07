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

/** The whole year as twelve monthly bars. */
public class YearWidget extends AppWidgetProvider {

    private static final String[] MON = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, YearWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_year);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#2A2B2D") : Color.parseColor("#EDEDED");

        v.setInt(R.id.yRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.yLabel, String.valueOf(j.optInt("year", 0)));
        v.setTextViewText(R.id.yAmount, empty ? "\u2014" : WidgetData.money(j, "yearTotal"));
        int best = j.optInt("bestMonth", 0);
        v.setTextViewText(R.id.ySub, empty ? "Open OneBudget to set up"
                : "heaviest month " + MON[Math.max(0, Math.min(11, best))]);
        v.setTextColor(R.id.yLabel, sub);
        v.setTextColor(R.id.yAmount, accent);
        v.setTextColor(R.id.ySub, sub);

        int[] vals = WidgetDraw.ints(j.optJSONArray("months12"), 12);
        boolean any = false; for (int x : vals) if (x > 0) any = true;
        v.setImageViewBitmap(R.id.yChart, MonthWidget.chart(any ? vals : new int[12], 620, 160,
                any ? accent : track, track));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 100, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.yRoot, pi);
        v.setOnClickPendingIntent(R.id.yChart, pi);
        return v;
    }
}
