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

/** What everything adds up to, with the last six months behind it. */
public class NetWorthWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, NetWorthWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_networth);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#3A3B3D") : Color.parseColor("#D8D8D8");

        v.setInt(R.id.nRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.nLabel, "Net worth");
        v.setTextViewText(R.id.nAmount, empty ? "\u2014" : WidgetData.money(j, "netWorth"));
        int[] ser = WidgetDraw.ints(j.optJSONArray("nwSeries"), 6);
        if (empty) v.setTextViewText(R.id.nSub, "Open OneBudget to set up");
        else if (ser.length > 1 && ser[0] != 0) {
            int pct = (int) Math.round((ser[ser.length - 1] - ser[0]) / (double) Math.abs(ser[0]) * 100);
            v.setTextViewText(R.id.nSub, (pct >= 0 ? "\u2191 " : "\u2193 ") + Math.abs(pct) + "% over six months");
        } else v.setTextViewText(R.id.nSub, "across your accounts");
        v.setTextColor(R.id.nLabel, sub);
        v.setTextColor(R.id.nAmount, accent);
        v.setTextColor(R.id.nSub, sub);
        v.setImageViewBitmap(R.id.nChart, MonthWidget.chart(ser, 620, 150, accent, track));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 150, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.nRoot, pi);
        v.setOnClickPendingIntent(R.id.nChart, pi);
        return v;
    }
}
