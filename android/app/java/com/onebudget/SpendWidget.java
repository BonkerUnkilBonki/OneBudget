package com.onebudget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * OneBudget home-screen widget: this month's spending, today's total,
 * the top category and a one-tap "+ Add expense".
 *
 * The web app pushes a small summary through the OneBudget bridge
 * (see MainActivity.widgetSync); this provider renders the last one it
 * received and never touches the network itself.
 */
public class SpendWidget extends AppWidgetProvider {

    static final String PREFS = "onebudget";
    static final String KEY = "widget";

    @Override
    public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(c));
    }

    /** Repaint every placed widget from the cached summary. */
    public static void updateAll(Context c) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(c);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(c, SpendWidget.class));
            if (ids != null && ids.length > 0) {
                for (int id : ids) mgr.updateAppWidget(id, build(c));
            }
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_spend);

        String raw = "";
        try {
            raw = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "");
        } catch (Throwable ignored) { }

        boolean dark = false;
        String sym = "\u20B9";
        String label = "This month";
        String month = "Open OneBudget";
        String today = "Add your first expense";
        String top = "";
        int accent = Color.parseColor("#1B6EF3");

        if (raw != null && raw.length() > 0) {
            try {
                JSONObject j = new JSONObject(raw);
                dark = j.optBoolean("dark", false);
                sym = j.optString("sym", "\u20B9");
                label = j.optString("label", "This month");
                month = sym + num(j.optDouble("month", 0));
                int n = j.optInt("count", 0);
                today = "Today " + sym + num(j.optDouble("today", 0)) +
                        "  \u00B7  " + n + (n == 1 ? " entry" : " entries");
                String t = j.optString("top", "");
                if (t != null && t.length() > 0) {
                    top = "Top: " + t + "  " + sym + num(j.optDouble("topAmt", 0));
                }
                try { accent = Color.parseColor(j.optString("accent", "#1B6EF3")); } catch (Throwable ignored) { }
            } catch (Throwable ignored) { }
        }

        v.setInt(R.id.wRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);

        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");

        v.setTextViewText(R.id.wLabel, label);
        v.setTextViewText(R.id.wMonth, month);
        v.setTextViewText(R.id.wToday, today);
        v.setTextViewText(R.id.wTop, top);
        v.setTextColor(R.id.wLabel, sub);
        v.setTextColor(R.id.wMonth, accent);
        v.setTextColor(R.id.wToday, sub);
        v.setTextColor(R.id.wTop, sub);
        v.setTextColor(R.id.wAdd, fg == 0 ? Color.WHITE : Color.WHITE);

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.wRoot, pi);
        v.setOnClickPendingIntent(R.id.wAdd, pi);
        v.setOnClickPendingIntent(R.id.wMonth, pi);
        return v;
    }

    /** Indian-style grouping, no decimals on whole amounts. */
    static String num(double d) {
        try {
            NumberFormat nf = NumberFormat.getInstance(new Locale("en", "IN"));
            nf.setMaximumFractionDigits(d % 1 == 0 ? 0 : 2);
            return nf.format(d);
        } catch (Throwable t) {
            return String.valueOf(Math.round(d));
        }
    }
}
