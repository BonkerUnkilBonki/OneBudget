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

/** This month against last month, as two bars. */
public class CompareWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, CompareWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_compare);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#3A3B3D") : Color.parseColor("#D8D8D8");

        v.setInt(R.id.cRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.cLabel, "This vs last month");
        v.setTextViewText(R.id.cAmount, empty ? "\u2014" : WidgetData.money(j, "month"));
        double now = j.optDouble("month", 0), before = j.optDouble("prevMonth", 0);
        if (empty) v.setTextViewText(R.id.cSub, "Open OneBudget to set up");
        else if (before <= 0) v.setTextViewText(R.id.cSub, "nothing last month");
        else {
            int pct = (int) Math.round((now - before) / before * 100);
            v.setTextViewText(R.id.cSub, (pct >= 0 ? "\u2191 " : "\u2193 ") + Math.abs(pct) + "%  \u00b7  was "
                    + WidgetData.money(j, "prevMonth"));
        }
        v.setTextColor(R.id.cLabel, sub);
        v.setTextColor(R.id.cAmount, accent);
        v.setTextColor(R.id.cSub, sub);
        v.setImageViewBitmap(R.id.cBars, WidgetDraw.twoBars(now, before, 620, 190, track, accent));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 130, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.cRoot, pi);
        v.setOnClickPendingIntent(R.id.cBars, pi);
        return v;
    }
}
