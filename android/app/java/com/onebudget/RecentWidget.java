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

/** The last few things you logged. */
public class RecentWidget extends AppWidgetProvider {

    private static final int[] ROWS = { R.id.r1, R.id.r2, R.id.r3 };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, RecentWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_recent);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        String sym = j.optString("sym", "\u20B9");

        v.setInt(R.id.rRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextColor(R.id.rLabel, sub);
        v.setTextColor(R.id.r1, fg);
        v.setTextColor(R.id.r2, fg);
        v.setTextColor(R.id.r3, fg);

        JSONArray recent = j.optJSONArray("recent");
        for (int i = 0; i < ROWS.length; i++) {
            String line = "";
            if (!empty && recent != null && i < recent.length()) {
                JSONObject o = recent.optJSONObject(i);
                if (o != null) {
                    String sign = "inc".equals(o.optString("type")) ? "+" : "-";
                    line = o.optString("note") + "   " + sign + sym + WidgetData.num(o.optDouble("amt", 0));
                }
            }
            v.setTextViewText(ROWS[i], line.isEmpty() ? (i == 0 ? "Nothing logged yet" : "") : line);
        }

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 90, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.rRoot, pi);
        return v;
    }
}
