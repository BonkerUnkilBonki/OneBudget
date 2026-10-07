package com.onebudget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

/** The summary the web app pushes; every widget reads from here. */
public class WidgetData {
    static final String PREFS = "onebudget";
    static final String KEY = "widget";

    static JSONObject read(Context c) {
        try {
            String raw = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "");
            if (raw != null && raw.length() > 0) return new JSONObject(raw);
        } catch (Throwable ignored) { }
        return new JSONObject();
    }

    static String money(JSONObject j, String key) {
        String sym = j.optString("sym", "\u20B9");
        return sym + num(j.optDouble(key, 0));
    }

    /** A short form that fits inside a ring: 11.4k, 2.1L, 1.2Cr. */
    static String moneyShort(JSONObject j, String key) {
        String sym = j.optString("sym", "\u20B9");
        return sym + shortNum(j.optDouble(key, 0));
    }

    static String shortNum(double d) {
        if (d >= 10000000) return trim(d / 10000000) + "Cr";
        if (d >= 100000) return trim(d / 100000) + "L";
        if (d >= 1000) return trim(d / 1000) + "k";
        return String.valueOf(Math.round(d));
    }

    private static String trim(double v) {
        long whole = Math.round(v);
        if (Math.abs(v - whole) < 0.05 || v >= 100) return String.valueOf(whole);
        return String.valueOf(Math.round(v * 10) / 10.0).replace(".0", "");
    }

    static String num(double d) {
        try {
            java.text.NumberFormat nf = java.text.NumberFormat.getInstance(new java.util.Locale("en", "IN"));
            nf.setMaximumFractionDigits(d % 1 == 0 ? 0 : 2);
            return nf.format(d);
        } catch (Throwable t) { return String.valueOf(Math.round(d)); }
    }

    static int color(String hex, int fallback) {
        try { return android.graphics.Color.parseColor(hex); } catch (Throwable t) { return fallback; }
    }
}
