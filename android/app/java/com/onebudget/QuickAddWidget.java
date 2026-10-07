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

/**
 * One compact row: a Quick add cell that opens the picker in the app, then a
 * shortcut per favourite category. Everything sits on a single line so the
 * widget never outgrows the row it is given.
 */
public class QuickAddWidget extends AppWidgetProvider {

    private static final int[] CELLS = { R.id.q2, R.id.q3, R.id.q4, R.id.q5 };

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, QuickAddWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    private static PendingIntent open(Context c, Intent it, int req) {
        it.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, req, it,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_quick);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));

        v.setInt(R.id.qRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        /* the cells must follow the theme too, or light-on-light disappears */
        int cell = dark ? R.drawable.widget_cell_dark : R.drawable.widget_cell_light;

        /* the leading cell opens the quick-add picker inside the app */
        v.setInt(R.id.q1, "setBackgroundResource", cell);
        v.setTextViewText(R.id.q1, "+ Add");
        v.setTextColor(R.id.q1, accent);
        Intent pick = new Intent(c, MainActivity.class);
        pick.putExtra("action", "quickadd");
        v.setOnClickPendingIntent(R.id.q1, open(c, pick, 19));

        JSONArray quick = j.optJSONArray("quick");
        for (int i = 0; i < CELLS.length; i++) {
            String name = "\u2014", id = "";
            if (quick != null && i < quick.length()) {
                JSONObject q = quick.optJSONObject(i);
                if (q != null) { name = q.optString("name", "\u2014"); id = q.optString("id", ""); }
            }
            v.setInt(CELLS[i], "setBackgroundResource", cell);
            v.setTextViewText(CELLS[i], name);
            v.setTextColor(CELLS[i], fg);
            Intent it = new Intent(c, MainActivity.class);
            if (!id.isEmpty()) it.putExtra("quickcat", id);
            else it.putExtra("action", "add");
            v.setOnClickPendingIntent(CELLS[i], open(c, it, 20 + i));
        }
        return v;
    }
}
