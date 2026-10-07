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

/** The month as a grid of days, each shaded by how much was spent. */
public class HeatmapWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, HeatmapWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_heat);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#2A2B2D") : Color.parseColor("#EDEDED");

        v.setInt(R.id.hRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.hLabel, j.optString("label", "This month"));
        v.setTextViewText(R.id.hAmount, empty ? "\u2014" : WidgetData.money(j, "month"));
        v.setTextViewText(R.id.hSub, empty ? "Open OneBudget to set up"
                : j.optInt("dom", 0) + " of " + j.optInt("dim", 30) + " days in");
        v.setTextColor(R.id.hLabel, sub);
        v.setTextColor(R.id.hAmount, accent);
        v.setTextColor(R.id.hSub, sub);

        int[] heat = WidgetDraw.ints(j.optJSONArray("heat"), j.optInt("heatDim", 31));
        v.setImageViewBitmap(R.id.hGrid, WidgetDraw.heatmap(heat, j.optInt("heatLead", 0),
                7, 30, 7, accent, track));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 110, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.hRoot, pi);
        v.setOnClickPendingIntent(R.id.hGrid, pi);
        return v;
    }
}
