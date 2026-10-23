# Task Uncle 🔔👓

> Uncle won't stop reminding you until it's done.

Add your professional and personal pending work by **event** (e.g. *Shimlawale CRM*, *Khalsa Virasat*) and **category** (GST, CA, YouTube, Developer team…). Every pending task sends repeat browser notifications — hourly, every 5h, 12h or daily — until you mark it done. Completion date & time are recorded.

## Run

Needs Bun and a local Postgres.

```bash
bun install
createdb task_uncle
cp apps/api/.env.example apps/api/.env
bun run db:push
bun run db:seed    # admin@taskuncle.app / uncle@123 + demo data
bun run dev        # web http://localhost:3500, API http://localhost:4500
```

Forgot-password code in dev: `123456`. **Settings → Reset demo data** restores the demo.

`apps/api` — Elysia + Drizzle + Postgres. `apps/web` — Vite + React 19 PWA.

## Features

- Events → categories (optionally team groups with members) → tasks
- Task: date + time, priority, status (pending / in progress / done), assignee, pending amount (₹), checklist, notes, per-task reminder interval
- Repeat reminders with **Mark done / Snooze** buttons, quiet hours, overdue boost, test notification, notification history
- Dashboard: pending / overdue / due today / done this week / pending payments, event progress
- All tasks with filters & search, calendar, people with pending work & dues, ⌘K search
- Phone: installable PWA, bottom tabs + FAB, bottom sheets, swipe to finish / snooze; dark mode
- Works offline: every change saves on the device first and syncs when you're back online (sync panel with retry / discard)
- Keyboard shortcuts: `N` new task, `?` for the full list
- JSON backup export / import

## Reminders when the app is closed

The API sends reminders by Web Push (VAPID keys in `apps/api/.env`, generate with `bunx web-push generate-vapid-keys`). Allow notifications in the app (or Settings → "When the app is closed"). With no internet, the open app reminds from what is saved on the device, an installed app in Chrome also checks in the background now and then, and pushes sent while offline arrive when the device reconnects.
