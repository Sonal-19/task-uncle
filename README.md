# Task Uncle 🔔👓

> Uncle won't stop reminding you until it's done.

Add your professional and personal pending work by **event** (e.g. *Shimlawale CRM*, *Khalsa Virasat*) and **category** (GST, CA, YouTube, Developer team…). Every pending task sends repeat browser notifications — hourly, every 5h, 12h or daily — until you mark it done. Completion date & time are recorded.

## Run

```bash
bun install
bun run dev        # http://localhost:3500
```

Demo login: `admin@taskuncle.app` / `uncle@123` (forgot-password code: `123456`). All data is dummy and saved in your browser; **Settings → Reset demo data** restores it.

## Features

- Events → categories (optionally team groups with members) → tasks
- Task: date + time, priority, status (pending / in progress / done), assignee, pending amount (₹), checklist, notes, per-task reminder interval
- Repeat reminders with **Mark done / Snooze** buttons, quiet hours, overdue boost, test notification, notification history
- Dashboard: pending / overdue / due today / done this week / pending payments, event progress
- All tasks with filters & search, calendar, people with pending work & dues, ⌘K search
- Phone: installable PWA, bottom tabs + FAB, bottom sheets, swipe to finish / snooze; dark mode
- JSON backup export / import

## Phase 2

`apps/api` (Elysia + Drizzle + Postgres) with real auth, Web Push so reminders arrive even when the browser is closed.
