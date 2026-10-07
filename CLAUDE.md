# Task Uncle

Bun workspaces monorepo. Only `apps/web` exists for now (Vite + React 19 + TanStack Router/Query + Tailwind v4); `apps/api` (Elysia + Drizzle + Postgres, like `~/Developer/Projects/finance-tracker`) comes in phase 2.
Architecture mirrors `~/Developer/Projects/finance-tracker`.

- Ports: web **3500**, API later **4500** (Vite already proxies `/api`). khata-connect uses 3400.
- Commands: `bun run dev`, `bun run typecheck`, `bun run check` (biome), `bun run icons` (re-renders PNG icons from `apps/web/public/logo.svg`).
- Domain: **Event** (project/area) → **Category** (group; `kind: team` when it has `memberIds`) → **Task**. People are assignees (no accounts). Everything is manual CRUD; the only automation is reminders.
- Dummy backend: `lib/mock-api.ts` over the persisted zustand store `stores/data-store.ts` (`localStorage` key `tu-data`, seed in `lib/mock/seed.ts`, dated relative to today). Components never touch the store directly — they use the hooks in `hooks/use-data.ts` (TanStack Query, every key starts with `"tu"`; mutations invalidate `keys.all`). Swapping to the real API = replace the `mockApi` bodies with Eden calls.
- Dummy auth: `admin@taskuncle.app` / `uncle@123`, reset OTP `123456` (`DEMO_*` in `mock-api.ts`). Session = `stores/auth-store.ts` (`tu-user`).
- Status: `pending | in_progress | done` + timestamps (`startedAt`, `completedAt`). Always change status through `mockApi.setTaskStatus` / `updateTask` so `statusPatch` keeps `completedAt` right. No boolean columns: on/off settings are `"on" | "off"`.
- Amounts are integers in paise; display only via `formatAmount` / `formatAmountShort` (`lib/format.ts`), forms use `toAmount` / `fromAmount`.
- Dates are `yyyy-MM-dd` strings, task time is `dueTime` `"HH:mm"`; use `DateInput` (dd/MM/yyyy, custom calendar) and `TimeInput` (hour/minute grid + AM/PM), never `<input type="date|time">`.
- Every dropdown is `SelectField` (`components/common/select-field.tsx`, over `ui/select`): pass `options` `{value,label}[]`, `""` is allowed. Never a native `<select>`. Pickers inside phone drawers must not rely on scrolling (the drawer's scroll lock blocks portalled popovers).
- Reminders: pure logic in `lib/reminders/reminder-engine.ts` (`dueReminders`, `nextReminderAt`, quiet hours, overdue boost = half interval); `hooks/use-reminders.ts` (mounted in `AppShell`) checks every 60 s + on tab focus, stamps `lastRemindedAt` before notifying (so other tabs skip), sends ≤3 task notifications + 1 summary, logs to `log`. Notifications go through the service worker (`src/sw.ts`, vite-plugin-pwa `injectManifest`) so they carry **Mark done / Snooze 1h** actions; the SW posts `{type:"task-action"}` to an open tab or opens `/tasks?task=<id>&action=…`.
- Without a backend, reminders only fire while the app is open (tab or installed PWA). Phase 2: Web Push (VAPID) + server scheduler.
- Phones (<768px): bottom tab bar + FAB, sheets are vaul drawers (`ResponsiveSheet`), swipe a task row right = done, left = snooze 1h. Desktop: sidebar + dialogs, ⌘K search.
- Open sheets from anywhere with `useSheets()` (`stores/sheet-store.ts`); the FAB pre-selects the event/category of the current route.
