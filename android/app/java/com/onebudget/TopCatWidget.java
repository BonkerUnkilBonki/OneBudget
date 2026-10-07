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

/** Where most of the month went. */
public class TopCatWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, TopCatWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_topcat);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        boolean empty = j.length() == 0;
        int sub = dark ? Color.parseColor("#A8A8A8") : Color.parseColor("#767676");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int track = dark ? Color.parseColor("#2A2B2D") : Color.parseColor("#EDEDED");

        JSONObject tc = j.optJSONObject("topCat");
        double month = j.optDouble("month", 0), amt = tc != null ? tc.optDouble("amt", 0) : 0;
        double share = month > 0 ? amt / month : 0;
        int cat = tc != null ? WidgetData.color(tc.optString("color", "#1B6EF3"), accent) : accent;

        v.setInt(R.id.pRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setTextViewText(R.id.pLabel, "Biggest category");
        v.setTextViewText(R.id.pName, empty || tc == null ? "Nothing yet" : tc.optString("name"));
        v.setTextViewText(R.id.pAmount, empty || tc == null ? "\u2014" : WidgetData.money(tc, "amt"));
        v.setTextViewText(R.id.pSub, empty || tc == null ? "" : Math.round(share * 100) + "% of " + WidgetData.money(j, "month"));
        v.setTextColor(R.id.pLabel, sub);
        v.setTextColor(R.id.pName, cat);
        v.setTextColor(R.id.pAmount, cat);
        v.setTextColor(R.id.pSub, sub);
        v.setImageViewBitmap(R.id.pBar, WidgetDraw.hbar(share, 620, 26, cat, track));

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 190, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.pRoot, pi);
        v.setOnClickPendingIntent(R.id.pBar, pi);
        return v;
    }
}
