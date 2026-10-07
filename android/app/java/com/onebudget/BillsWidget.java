package com.onebudget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** What is due next. */
public class BillsWidget extends AppWidgetProvider {

    private static final int[] ROWS = { R.id.b1, R.id.b2, R.id.b3 };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, BillsWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_bills);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");

        v.setInt(R.id.bRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.bLabel, "Bills due");
        v.setTextViewText(R.id.bTotal, empty ? "" : WidgetData.money(j, "billsMonth") + " a month");
        v.setTextColor(R.id.bLabel, sub);
        v.setTextColor(R.id.bTotal, sub);
        for (int r : ROWS) v.setTextColor(r, fg);

        JSONArray bills = j.optJSONArray("bills");
        for (int i = 0; i < ROWS.length; i++) {
            String line = "";
            if (!empty && bills != null && i < bills.length()) {
                JSONObject o = bills.optJSONObject(i);
                if (o != null) {
                    int d = o.optInt("days", -1);
                    String when = d < 0 ? "" : d <= 0 ? "  \u00b7  today" : d == 1 ? "  \u00b7  tomorrow" : "  \u00b7  in " + d + " days";
                    line = o.optString("name") + when + "   " + WidgetData.money(o, "amt");
                }
            }
            v.setTextViewText(ROWS[i], line.isEmpty() ? (i == 0 ? "Nothing scheduled" : "") : line);
        }

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("action", "bills");
        PendingIntent pi = PendingIntent.getActivity(c, 170, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.bRoot, pi);
        return v;
    }
}
