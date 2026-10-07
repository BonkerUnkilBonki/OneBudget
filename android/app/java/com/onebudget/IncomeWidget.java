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

/** What came in this month, against what went out. */
public class IncomeWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, IncomeWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_income);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int ok = Color.parseColor("#12B76A");
        int danger = Color.parseColor("#EF4444");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#3A3B3D") : Color.parseColor("#D8D8D8");

        v.setInt(R.id.iRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.iLabel, "Money in");
        v.setTextViewText(R.id.iAmount, empty ? "\u2014" : WidgetData.money(j, "income"));
        v.setTextViewText(R.id.iSub, empty ? "Open OneBudget to set up"
                : "spent " + WidgetData.money(j, "month") + "  \u00b7  kept " + WidgetData.money(j, "saved"));
        v.setTextColor(R.id.iLabel, sub);
        v.setTextColor(R.id.iAmount, ok);
        v.setTextColor(R.id.iSub, sub);
        v.setImageViewBitmap(R.id.iBars, WidgetDraw.twoBars(j.optDouble("income", 0), j.optDouble("month", 0),
                620, 175, ok, danger));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 160, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.iRoot, pi);
        v.setOnClickPendingIntent(R.id.iBars, pi);
        return v;
    }
}
