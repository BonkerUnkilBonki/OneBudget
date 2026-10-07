# OneBudget — expense tracker

A local-first **expense tracker**, built by redesigning the **Gitly**
source (`onegit-src`) you shared: the entire One UI 9 design system, the
typeface, the router/sheet/theme infrastructure and the Android WebView shell
are reused, while the GitHub domain is replaced with personal finance.

**No account required.** The app opens straight into your money — everything is
stored on the device and works offline. Backup/sync is optional.

---

## What it does

An expense tracker only — there are no budgets, limits or alerts anywhere in it.

**Home** — this month's spend with a change chip, three key numbers (today, average
per day, saved), a one-tap **Quick add** row of the categories you use most, a
**Repeat last** button, upcoming bills, savings goals, account balances, where the
money went, and recent transactions.

**Activity** — every transaction for the month grouped by day with a daily total,
searchable, filterable by expense/income, and searchable across all months.

**Today** — a written summary of the day, today's numbers, and the day's spending
broken down by category, time of day and account, plus a timeline.

**Recurring** — subscriptions, rent, EMIs and bills: monthly and yearly totals,
what is due next, and one-tap "mark as paid". Reached from Home or Settings, so
the tab bar has room for Today.

**Insights** — Overview, Trends, Categories and Compare (see the charts below).

**Settings** — themes, accents, currency, categories, accounts, goals, on-device
storage status, export/import, and optional backup.

## Voice entry — speak it, it fills the form

Tap the microphone (the round button above the + on every list screen, or the mic
inside the entry panel) and say the expense. The app works out what you meant and
pre-fills the form for you to confirm with the tick:

- **Amount** — "250", "1,250", "2 thousand", "3k", "1 lakh", "5 hundred"
- **Category** — from ~180 keyword synonyms: "swiggy" → Food, "uber"/"petrol" →
  Transport, "electricity bill" → Bills, "netflix" → Subscriptions, and so on
- **Date** — "yesterday", "2 days ago", "last friday", "on the 5th", "last week"
- **Income vs expense** — "salary received", "cashback", "refund"
- **Account** — if you said "cash", "card", "upi" or "bank"

It runs through Android's on-device speech recogniser in the app (with the Web
Speech API as a fallback in a browser), and the banner above the keypad always
shows exactly what it heard, so nothing is entered blind.

## Bill scanning — photograph it, it fills the form

Tap the camera button (next to the mic on every list screen, or from the scan
sheet) and photograph a bill, a receipt or a UPI payment screenshot. The text is
read **on the device**, then turned into an entry:

- **Total** — prefers "grand total" / "total amount" / "amount payable" over a
  sub-total, and skips GST, tax, discount and round-off lines
- **Date** — 05/10/2026, 04-10-2026, "12 Oct 2026" (with day/month swap
  detection)
- **Merchant** — the shop or restaurant name from the top of the bill, or the
  sender's name on a payment screenshot ("received from Rahul Sharma")
- **Category** — from the merchant and the line items, using the same ~180
  keyword synonyms as voice
- **Income or expense** — a payment-received screenshot is recognised as income
- **Account** — "Paid by UPI / Card / Cash / NEFT" sets the account

Before saving, the sheet shows a banner of exactly what was read
("BIG BASKET SUPERMARKET · ₹1,370.25 · Yesterday") with a **Text** button that
reveals the full recognised text, so you can always check the numbers.

**Everything runs offline.** The recognition engine (Tesseract, its wasm core and
the English data) is bundled inside the app — about 7 MB of the APK — so no
network, no Play Services and no upload of your bills anywhere. In a plain
browser the same page uses the bundled engine directly, and if there is no engine
at all the sheet says so rather than failing silently.

You can also **Choose an image** instead of using the camera, which is handy for
screenshots of UPI or card payments.

## Home-screen widget

An **OneBudget spending** widget: this month's total, today's total and entry
count, the top category, and a "+ Add expense" button — all tappable to open the
app. It follows your light/dark theme and accent colour, and the app pushes a fresh
summary to it on every change, so it is always current without opening the app.

## Tap a card for more

Every summary card opens a panel with the full numbers and the actions that
belong to it:

- **Spent this month** → the whole month: daily chart, income, savings rate,
  busiest day, biggest expense, top category, comparison with last month, plus
  *See all transactions*, *Month in review* and *Export this month as CSV*
- **Today / Avg per day / Saved / Entries** → today's entries and how they
  compare with your average; a 14-day chart with your best and worst day and a
  projected month total; income vs spending over six months with a month-by-month
  savings list; entry counts and the latest entries
- **Spending pace** → the cumulative chart with "ahead/behind by" against last month
- **Any category bar** → that category alone: this month vs last, average per
  entry, a six-month trend, its biggest expense, and its recent transactions,
  with *Add to this category* and *Show in Activity*
- **Upcoming bills** → the subscriptions panel with monthly/yearly totals
- **Accounts / where it was paid from** → balances and the paid-from split

Cards show a chevron or a "Details" hint so it is obvious they open.

## One-hand panels

Every sheet is a scrollable body with its **action buttons pinned to the bottom**,
so the primary button is always fully visible and always under your thumb — no
more scrolling to find *Save*, and nothing gets cut off half-way. The entry
keypad is pinned the same way.

## Custom accent colour

Settings → Appearance → **Custom colour** lets you pick any colour: a colour
picker, a hex field (`#7C3AED`), or one of ten suggestions. The accent's darker
shade and glow are derived automatically, and text on the accent switches
between light and dark so buttons stay readable on pale colours.

## Today — a written summary of your day

The third tab is **Today**, and it is the only screen that talks to you. At the
top is a short paragraph written from your own numbers:

> *Good afternoon. You have spent ₹240 today across 1 entry. That is comfortably
> below your usual ₹650. Transport leads at ₹240. Most of it happened in the
> afternoon. That is below yesterday's ₹370. At this pace October lands near
> ₹7,600.*

Below it: today's numbers, then **the day's spending broken down** — by category
(tappable rows), by **time of day** (morning/afternoon/evening/late night, with
the busiest hour), and by how it was paid. Then the day as a **timeline** in
order, a few "worth knowing" observations, and the three ways to add something.

**Where the summary comes from.** By default it is written **on this phone** by a
small insight engine that reads your own figures — no account, no key, no
network, nothing leaves the device. If you would rather use a model of your own,
Settings → *AI assistant* (or the link on the Today card) takes any
OpenAI-compatible endpoint, model name and key; your key is stored only on the
device and the on-device writer is used automatically if the call fails.

## One add button, three ways in

The floating buttons are now a single **+** that opens a small labelled stack —
**Speak**, **Scan bill**, **Type it** — over a dimmed backdrop, so nothing floats
over your content any more. The entry panel also carries its own mic and camera
buttons. The two-step dial is deliberate: it is what stops the buttons covering
the cards behind them.

## No more system dialogs

The date field used to open the phone's own calendar and the "Repeats" field its
own radio menu — both stark white system components that clashed with the app.
Both are now drawn from the app's own design system:

- **Date picker** — a month grid with rounded day cells, today outlined, the
  selection filled with your accent colour, and *Use this date* / *Today* /
  *Clear* pinned at the bottom. Follows light and dark.
- **Option list** — a plain list panel with a tick on the current choice.

Every `input type="date"` and `select` has been removed from the app.

## Offline voice

Voice now asks Android for its **on-device recogniser**
(`EXTRA_PREFER_OFFLINE`), so it works with no network on phones that have an
offline speech model installed — the same goal as the bundled bill reader.

## Typing does not reload the screen

The app used to rebuild a whole screen on every keystroke, and each rebuild
replayed its entrance animation — so typing felt like the app reloading. Two
places did it: the search field on Activity re-rendered the entire view on every
character, and each key on the amount pad rebuilt the entry panel (replaying the
slide-up).

Both now update only what actually changed:

- **Search** rewrites just the results block below the field. The input itself is
  never touched, so it keeps focus, its caret and the keyboard.
- **The amount pad** rewrites the number, nothing else.
- **Category, account and note** taps move a highlight or refresh a chip in place.
- Panels still slide up when they *open*, but never again while they are being
  used.

Every text field in the app — note, account name, recurring name, goal, category,
colour — keeps focus and caret while you type.

## Twenty home-screen widgets

Every widget reads the same summary the app pushes, and every one follows your
light/dark theme and accent colour.

| Widget | What it shows |
|---|---|
| **Spending** | This month, today, and a one-tap Add |
| **Today** | Today's total and count |
| **Capture** | Scan a bill and Speak it — into the camera or the microphone |
| **Add** | One big button that opens the quick-add picker |
| **Quick add** | One compact row: an Add cell, then a shortcut per favourite category |
| **Recent** | The last three things you logged |
| **Month** | This month, income, savings and a seven-day bar chart |
| **This week** | This week's total, the change vs last week, and a seven-day bar chart |
| **By category** | This month drawn as a ring, one arc per category |
| **Pace** | This month's cumulative spend against last month's, as two lines |
| **Year** | The whole year as twelve monthly bars, with the heaviest month named |
| **Heatmap** | The month as a grid of days, each shaded by how much you spent |
| **Weekdays** | Your average spend on each day of the week, with the heaviest day named |
| **Compare** | This month against last month as two bars, with the change |
| **Ring** | Today's spending as a progress ring against your usual day |
| **Net worth** | What everything adds up to, with six months behind it |
| **Money in** | This month's income against what went out, as two bars |
| **Bills due** | The next three bills, each with how many days away it is |
| **Fortnight** | The last fourteen days as a line |
| **Biggest category** | Where most of the month went, as a share bar |

Most are drawn on a canvas: the bar charts, the line charts, the donut, the
heatmap, the two-bar comparisons, the progress ring and the share bar.

### Capture — camera and microphone on the home screen

The **Capture** widget is two cells: **Scan a bill** opens the bill reader (photo
or image), **Speak it** opens voice entry. Both land in the app already in that
flow, and both work offline.

### The Quick add widget was invisible

Two things were wrong. It stacked a title above its cells, which needed more
height than a one-row widget is given, so the top was cut off. And the cells
always used the *light* cell background while the text colour switched to white
in dark mode — so in dark mode the tiles were white-on-white and read as blank.

It is now a single horizontal row that fills whatever height it is given (so it
can never overflow), the cell backgrounds follow the theme, and the leading
**+ Add** cell carries the accent colour instead of blue-on-blue.

## Quick add opens a picker

Tapping **Quick add** on Home (the accent chip at the start of the row, or the
**+ Add** cell on the widget) opens a pop-up where you choose what to add:

- the three ways in — **Type it**, **Speak it**, **Scan a bill**;
- **Frequent** — the categories you actually use;
- **All categories** — every one, expense and income.

Pick a category and the keypad opens with it already selected. The category chips
still sit on Home for one-tap entry, so the fast path stays one tap.

## Density

The spacing scale was carrying too much air — cards were padded at 22px,
settings rows at 15px a side, and section headers sat 26px apart, which pushed a
screen of one-line rows well past the fold. Everything has been tightened:

| | Before | Now |
|---|---|---|
| Card padding | 22px | 14px |
| Settings row | 59px tall | 49px |
| Section header gap | 26px | 13px |
| Card corner radius | 32px | 22px |
| Metric tile padding | 15px | 11px |

Then the same treatment went across the rest of the app. The list rows — the
transaction rows, the recurring rows, the account rows and the goal cards — kept
their *own* 13-16px of padding on top of the card's, so a row sat 34px in from
the edge, and each one carried a 42px category chip that set a floor on its
height.

| | Before | Now |
|---|---|---|
| Transaction / account row | 61px | 54px |
| Goal card | 71px | 65px |
| Category chip | 42px | 34px |
| Chart top margin | 18px | 12px |
| Day header | 20px top | 13px |
| Text field | 54px | 42px |
| Amount box | 78px | 63px |
| Form label gap | 16px | 12px |
| Search bar | 54px | 46px |
| Segmented switch | 48px | 42px |
| Month picker | 50px | 40px |
| Button | 48px | 44px |
| Panel header | 62px | 52px |

Nothing was removed to make any of it fit — it is the same content, closer
together. This is one shared scale, so every screen benefits, not just Settings.

## One-hand mode

Settings → *Appearance* → **One-hand mode**. It does two things.

**Everything tighter again.** A second density tier on top of the one above —
cards, rows, tiles, chips and panels all step down once more.

**Shaped for a thumb.** Panels open shorter (74vh instead of 86vh), so their
content and buttons sit lower where your thumb already is. Any panel that had
nothing pinned at the bottom gets a **Close** pinned there, so no screen ever
needs a reach to the top corner to get out of. The add button grows to 64px and
sits in the thumb zone, and the bottom nav targets get taller and their icons
bigger.

Measured against normal mode, on the same data:

| Screen | Normal | One-hand |
|---|---|---|
| Settings | 1978px | 1750px (12% shorter, an extra section fits) |
| Home | 2667px | 2464px |
| Activity | 1433px | 1291px |
| Today | 1381px | 1281px |

## Updates

Settings → *About* → **OneBudget v1.0** checks GitHub for a newer build and tells
you what is new. The same approach as Gitly, pointed at
`github.com/BonkerUnkilBonki/OneBudget`:

- it reads the releases on the repo (public, so **no sign-in needed**), newest
  published one first, and falls back to tags so it works before the first
  release is cut;
- a release counts as newer if its version beats this build's **or** if it was
  published after this build was installed — so a release still counts when you
  forget to bump the version;
- versions are read out of tags and names alike (`v2.60`, `vStable 2.60` and
  `2.60` all give 2.60).

When something is newer you get an **Update available** card on Home and a badge
on the Settings row. The Updates sheet shows what is installed, what is out,
the release notes, and:

- **Download and install** — fetches the `.apk` asset from the release and hands
  it to Android's installer (you confirm the install; Android requires that);
- **Open on GitHub** — the release page, if you would rather do it by hand;
- **Check again**.

It checks once quietly on launch and only when you are online. With no network
it says so and nothing else changes — the app stays entirely offline-first.

## Sync now, on the screen

Backup & sync used to show a switch that was not really a switch — tapping it
just opened a panel, and the only way to actually back up was a button inside
that panel. The row now has a chevron (it opens the panel, as a chevron should)
and a **Sync now** button sits directly on the Settings screen, so the action you
came for is one tap away instead of two.

## Undo, templates, and a guard against logging twice

- **Undo on delete.** Deleting anything shows a toast with an **Undo** on it for
  a few seconds, and puts the entry back exactly where it was.
- **Templates.** Fill in a usual expense and tap the bookmark in the keypad
  header to save it. Templates then appear at the top of the quick-add picker —
  one tap opens the keypad already filled in. Manage them in Settings →
  *Templates*.
- **Duplicate guard.** If you add an entry that matches one from the last couple
  of days — same amount, same category — the app shows you the existing one and
  asks before it lands.

## The keypad glows

Every button in the entry panel flashes with your accent glow as it is pressed —
the number keys, the categories, the chips and the Expense/Income switch. It
follows the accent colour, and stops if you turn Glow effects off or Reduce
motion on.

## Long-press the app icon

Four shortcuts: **Add**, **Scan**, **Speak** and **Today**. Each opens the app
already in that flow, the same as the widgets do.

## Net worth

A card sits on Home under the four tiles: what everything adds up to — the sum
of every account balance (its opening figure, plus income, minus spending). It
carries the change over six months, your account count, your assets, and a
six-month line chart. Tap it for the full panel: assets and what is owed, the
chart, every account's balance, and the month's money in, money out and kept.

## Full offline data support

Nothing in the app needs a network, and now nothing is lost either.

- **Two copies of your data.** `localStorage` is the fast copy the app reads at
  launch; IndexedDB is the durable mirror. If the fast copy is ever missing, the
  app rebuilds itself from the mirror.
- **The browser is asked to keep it** (`navigator.storage.persist()`), so the
  data is not evicted when the phone is low on space.
- **A snapshot a day, five kept.** One is taken automatically, and
  Settings → *Offline* → *Restore an earlier copy* lets you go back to any of
  them. This is the safety net for a bad edit or a cleared browser store.
- **The web version is fully cached.** The service worker precaches the whole
  app shell; the bill reader's engine is cached the first time you scan, so it
  works offline from then on. The only network calls in the entire app are the
  two you switch on yourself — GitHub backup and your own AI endpoint.

Settings → *Offline* shows how much is stored, whether the browser granted
persistence, and whether you are online.

## Material icons

Settings → *Appearance* → **Material icons**. Off, category icons sit in flat
round chips. On, each one sits in an **organic shape** — circle, squircle, pill,
gem, clover, flower, sunny, burst, puffy, tri-blob, oval or cookie — drawn from a
polar curve rather than a fixed asset.

Each category keeps the same shape (it is derived from the category's id, so it
never flickers between renders), and every shape slowly **morphs into a
different one and back** over ten seconds. *Shuffle shapes* re-rolls which
category gets which. Turn on *Reduce motion* and the morphing stops.

## Android navigation and gestures

The back gesture, the hardware button and the three-button nav bar all route
into the app first, through `window.__onBack()`:

1. an open panel closes,
2. otherwise you return to Home,
3. and only then does Android leave the app.

On Android 13 and later this is registered through the platform
`OnBackInvokedDispatcher` with `enableOnBackInvokedCallback` set, so the edge
swipe and predictive back are handled natively; older versions use
`onBackPressed`. Panels can also be **pulled down from the grab handle** (or the
title bar) to dismiss, and tapping the dimmed backdrop closes them.

## Transaction details

Open any entry and you get the amount, date, note and account, with **Edit** and
**Delete** side by side on one line. The old stacked three-button block — and the
**Duplicate** action with it — is gone.

## Seven home-screen widgets

| Widget | Shows |
| --- | --- |
| **OneBudget spending** | month total, today, entry count, top category, + Add |
| **OneBudget today** | today's total and count with a + Add button |
| **OneBudget quick add** | four one-tap shortcuts into the keypad, one per favourite category |
| **OneBudget month** | month total, income, savings and a seven-day bar chart drawn into the widget |

All four follow your light/dark theme and accent colour, refresh whenever the app
changes anything, and tapping them opens the app — the quick-add buttons open it
straight into the keypad with that category already chosen.

## Offline, by design

- Every entry is written to the device the moment you tap the tick — no network
  involved, so entry works with airplane mode on or no signal at all.
- Settings shows an **On-device storage** row ("Saved on this phone · last saved
  just now"), and Home shows an offline strip while you are offline.
- The hosted web version registers a service worker so the app itself loads
  offline; the Android app already carries every file inside the APK.
- Backup/sync stays optional: a JSON or CSV export needs no account, and GitHub
  backup only happens if you turn it on.

## Charts & visual components

Every number in the app has a picture next to it:

- **Line / area charts** — spending pace this month against last month (cumulative),
  12-month spending trend, and income vs spending.
- **Bar charts** — daily spending, week-by-week within a month, spend per month for
  a year, and money saved per month.
- **Spending calendar heatmap** — the whole month as a calendar, each day shaded by
  how much you spent, plus a 12-week strip heatmap of recent history.
- **Sparklines** — inline trend lines in the KPI tiles and beside every category in
  the trends list.
- **Donut charts** — category split and where money was paid from, with legends,
  amounts and percentages.
- **Progress rings** — budget used, and one per savings goal.
- **Day-of-week bars** — average spend per weekday, so you can see which days cost
  you the most.
- **KPI tiles, trend chips and comparison tables** — every figure carries its change
  against the previous period.

## Tracker tools

- **Accounts / wallets** — Cash, bank, card, UPI: set an opening balance and every
  account shows its running balance, money in and money out.
- **Recurring bills & subscriptions** — rent, EMIs, Netflix, insurance. OneBudget
  totals the monthly and yearly cost, shows what is due next (with overdue
  warnings) and records a bill as paid in one tap.
- **Savings goals** — target, progress ring, amount left, and a rough estimate of
  how many months to go based on what you have actually been saving. Contributions
  can be recorded as transactions under the Savings category.
- **Weekly budget** — alongside the monthly limit, for pacing yourself week by week.
- **Budget alerts** — a warning when a category passes 80% of its limit, and when
  anything goes over (once per month each, never nagging).
- **Month in review** — a summary card you can copy and share.
- **Export** — JSON backup plus a **CSV** of every transaction for a spreadsheet.
- **Search across all months**, filters, transaction duplication, quick-repeat note
  chips, and account/category pickers on every entry.

The Insights tab is split into four sections: **Overview** (KPI tiles, week-by-week,
spending calendar, day-of-week, payment split, most frequent items, biggest
expenses), **Trends** (12-month line and bar charts, income vs spending, pace, heat
strips, savings per month), **Categories** (donut, all categories, per-category
trend sparklines, budget vs actual) and **Compare** (this month vs last month vs
the same month last year, category movement, and plain-language takeaways).

## Using it without an account
There is no sign-in wall. Categories, budgets, currency and all transactions
live in local storage on the device. Settings → *Backup & sync* explains that
an account is optional; only if you want it does it offer GitHub sign-in
(personal access token, or one-tap device flow in the app) to keep a private
copy in a **secret GitHub Gist** and restore it on another device. You can also
export/import a JSON backup file with no account at all.

---

## Run the web version

    python3 -m http.server 8000     # then open http://localhost:8000

Opening `index.html` directly also works (the app is plain HTML/CSS/JS with no
build step and no dependencies).

## Build the APK

    cd android && ./build.sh

Needs JDK 17 and Android build-tools 34 + platform android-34 (no Gradle).
Point it at them with `JDK_BIN`, `BT` and `PLATFORM_JAR` if they are not on the
PATH. Output: `OneBudget.apk` (debug-signed, min SDK 24, target 34).

The Android side is a thin WebView host (`android/app/java/com/onebudget/MainActivity.java`)
that adds only what a page cannot do itself: theming the system bars, the
native clipboard, saving a backup into Downloads, the file picker for imports,
and GitHub's OAuth device flow.

---

## One-handed entry panel

Only the add/edit transaction panel was reworked for the thumb; the rest of the
app keeps the layout it had:

- The amount is typed on an on-screen **keypad** in the lower half of the sheet,
  so the system keyboard never covers the form and there is nothing to scroll.
- Categories are one swipeable row of chips instead of a tall grid.
- Date, account and note are compact chips that expand inline only when tapped.
- The save action (the tick) sits under your right thumb.

## Bug fix — horizontal page shift

The Insights screen's spending-calendar grid used `repeat(7, 1fr)` tracks. A
`1fr` track carries an implicit `min-content` minimum, and an `aspect-ratio: 1`
cell inflated that minimum to 72px per column — 504px of tracks inside a 292px
card. That gave the whole scroller a horizontal scroll, so every screen could be
dragged sideways and its left edge clipped (missing calendar day digits, a cut
"W1" bar label, a cut weekday, "Average…" losing its first letters).

Fixed by using `minmax(0, 1fr)` for every grid in the app (calendar, weekday row,
category pickers, keypad, month picker) and locking the page with
`overflow-x: hidden` on the scroller, so the app can never scroll sideways.

## Files

    index.html          app shell (app bar, page header, 4-tab nav, FAB)
    app.js              tracker: storage, calculations, views, sheets, router, sync
    app.css             the One UI 9 design system (from the Gitly source)
    tracker.css         tracker components built on top of it
    oauth-config.js     optional GitHub OAuth client ID for one-tap sign-in
    fonts/OneGitSans.ttf  the source's typeface
    ocr.html / ocr.js   the on-device bill reader page
    vendor/             Tesseract engine, wasm core and English data (offline OCR)
    android/            WebView shell (mic + camera + widget) + build script + icon

## Notes on the typeface

The source font had no rupee glyph, so `₹` was falling back to another font and
looked out of place. The glyph has been grafted into `OneGitSans.ttf` from the
Google Sans file in your `Pixel_Rounded_Font.zip`, scaled to match the font's
cap height — so every amount in the app now uses one consistent typeface.

## Credits

Design language, component CSS, router/sheet/theme patterns and the Android
shell are derived from the **Gitly** source you provided. The finance logic,
views, charts and the local-first/optional-sync model are new.
