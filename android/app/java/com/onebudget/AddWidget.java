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

/** One large target: tap it and the quick-add picker opens. */
public class AddWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, AddWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_add);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));

        v.setInt(R.id.aRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setInt(R.id.aCell, "setBackgroundResource",
                dark ? R.drawable.widget_cell_dark : R.drawable.widget_cell_light);
        v.setTextColor(R.id.aCell, accent);
        v.setTextViewText(R.id.aCell, "+  Add an expense");

        Intent it = new Intent(c, MainActivity.class);
        it.putExtra("action", "quickadd");
        it.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 80, it,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.aCell, pi);
        v.setOnClickPendingIntent(R.id.aRoot, pi);
        return v;
    }
}
