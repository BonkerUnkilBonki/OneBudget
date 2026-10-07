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

/**
 * Two taps straight into the app: photograph a bill, or speak an expense.
 * Both open the same flows the buttons inside the app do.
 */
public class CaptureWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    public static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, CaptureWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Throwable ignored) { }
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_capture);
        JSONObject j = WidgetData.read(c);
        boolean dark = j.optBoolean("dark", false);
        int fg = dark ? Color.parseColor("#F2F2F2") : Color.parseColor("#191919");
        int accent = WidgetData.color(j.optString("accent", "#1B6EF3"), Color.parseColor("#1B6EF3"));
        int cell = dark ? R.drawable.widget_cell_dark : R.drawable.widget_cell_light;

        v.setInt(R.id.cRoot, "setBackgroundResource",
                dark ? R.drawable.widget_bg_dark : R.drawable.widget_bg_light);
        v.setInt(R.id.cCam, "setBackgroundResource", cell);
        v.setInt(R.id.cMic, "setBackgroundResource", cell);
        v.setTextColor(R.id.cCam, accent);
        v.setTextColor(R.id.cMic, accent);

        Intent cam = new Intent(c, MainActivity.class);
        cam.putExtra("action", "scan");
        Intent mic = new Intent(c, MainActivity.class);
        mic.putExtra("action", "speak");
        v.setOnClickPendingIntent(R.id.cCam, pi(c, cam, 70));
        v.setOnClickPendingIntent(R.id.cMic, pi(c, mic, 71));
        v.setOnClickPendingIntent(R.id.cRoot, pi(c, new Intent(c, MainActivity.class), 72));
        return v;
    }

    private static PendingIntent pi(Context c, Intent it, int req) {
        it.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, req, it,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
