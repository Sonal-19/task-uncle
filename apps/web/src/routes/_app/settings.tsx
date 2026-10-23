import { createFileRoute } from "@tanstack/react-router";
import {
  BellRing,
  Download,
  Moon,
  RotateCcw,
  Send,
  Upload,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { InstallButton } from "@/components/app/install-app";
import { SectionCard } from "@/components/app/section-card";
import { ShortcutKeys } from "@/components/app/shortcuts";
import { THEMES } from "@/components/app/user-menu";
import { confirm } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { PageLoader } from "@/components/common/states";
import { TimeInput } from "@/components/common/time-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSettings, useUpdateSettings } from "@/hooks/use-data";
import { usePermission } from "@/hooks/use-permission";
import { usePush } from "@/hooks/use-push";
import { runReminderCheck } from "@/hooks/use-reminders";
import { api, callMsg } from "@/lib/api";
import {
  discardAll,
  localSnapshot,
  pendingCount,
  refresh,
} from "@/lib/offline/sync";
import { showNotification } from "@/lib/reminders/notify";
import { inQuietHours } from "@/lib/reminders/reminder-engine";
import {
  CUSTOM_MINUTES_MAX,
  CUSTOM_MINUTES_MIN,
  everyLabel,
  INTERVALS,
  type Settings,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { useUiStore } from "@/stores/ui-store";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const PERM_LABEL = {
  granted: { text: "Allowed", className: "bg-done/12 text-done" },
  denied: { text: "Blocked", className: "bg-overdue/12 text-overdue" },
  default: { text: "Not asked yet", className: "bg-pending/12 text-pending" },
  unsupported: {
    text: "Not supported",
    className: "bg-muted text-muted-foreground",
  },
};

function SettingsPage() {
  const settingsQ = useSettings();
  const update = useUpdateSettings();
  const [perm, request] = usePermission();
  const push = usePush();
  const { theme, setTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const fileRef = useRef<HTMLInputElement>(null);

  if (settingsQ.isLoading || !settingsQ.data) return <PageLoader />;
  const s = settingsQ.data;
  const on = s.notifications === "on";

  async function testNotification() {
    let p = perm;
    if (p === "default") p = await request();
    if (p !== "granted") {
      toast.error(
        p === "denied"
          ? "Notifications are blocked for this site in your browser."
          : "This browser doesn't support notifications.",
      );
      return;
    }
    // With push on, the test goes through the server like real reminders.
    if (push.state === "on") {
      try {
        const { message } = await callMsg(api.push.test.post());
        toast.success(message);
        return;
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    await showNotification({
      title: "🔔 Test from Task Uncle",
      body: "This is how your pending-task reminders will look.",
      tag: "test",
    });
    toast.success("Test notification sent");
  }

  async function togglePush(v: boolean) {
    if (!v) {
      await push.disable();
      toast.info("This device now gets reminders only while the app is open");
      return;
    }
    try {
      const next = await push.enable();
      if (next === "on")
        toast.success("Reminders will reach this device even when closed");
      else if (next === "blocked")
        toast.error("Notifications are blocked for this site in your browser.");
      else if (next === "unconfigured")
        toast.error("Push isn't set up on the server yet.");
    } catch (e) {
      toast.error((e as Error).message || "Could not turn push on");
    }
  }

  async function remindNow() {
    // Treat every pending task as due, then run the engine once.
    const n = await runReminderCheck(new Date(), true);
    toast.info(
      n
        ? `Sent reminders for ${n} pending tasks`
        : "No reminders due (quiet hours or off?)",
    );
  }

  async function exportBackup() {
    // What this device shows, unsynced changes included (works offline).
    const data = await localSnapshot().catch(() => null);
    if (!data) {
      toast.error("Connect once so there is data to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `task-uncle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Replaces everything on the server; changes still waiting to sync
   * would land on top of the restored data, so they are dropped. */
  async function replaceAll(
    title: string,
    run: () => Promise<{ message: string }>,
  ) {
    const n = pendingCount();
    if (
      !(await confirm({
        title,
        description: `All your events, tasks and people are replaced.${
          n
            ? ` ${n} unsynced change${n > 1 ? "s" : ""} on this device will be dropped.`
            : ""
        }`,
        confirmText: "Replace",
        destructive: true,
      }))
    )
      return;
    try {
      const { message } = await run();
      discardAll();
      await refresh();
      toast.success(message);
    } catch (e) {
      toast.error((e as Error).message || "Could not read that file");
    }
  }

  async function importBackup(file: File) {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast.error("That file is not a Task Uncle backup");
      return;
    }
    await replaceAll("Restore this backup?", () =>
      callMsg(api.backup.post(data)),
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <BellRing className="size-4.5 text-primary" /> Reminders
          </span>
        }
      >
        <div className="space-y-5">
          <Row
            title="Notifications"
            text="Remind me about pending tasks until they are marked done."
          >
            <Switch
              checked={on}
              onCheckedChange={async (v) => {
                update.mutate({ notifications: v ? "on" : "off" });
                if (v && perm === "default") await request();
              }}
              aria-label="Notifications"
            />
          </Row>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/70 p-3">
            <div className="text-sm">
              <span className="text-muted-foreground">
                Browser permission:{" "}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  PERM_LABEL[perm].className,
                )}
              >
                {PERM_LABEL[perm].text}
              </span>
              {perm === "denied" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Allow it from the lock icon in the address bar →
                  Notifications.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {perm === "default" && (
                <Button size="sm" onClick={request}>
                  Allow
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={testNotification}>
                <Send /> Test
              </Button>
            </div>
          </div>

          <Row
            title="When the app is closed"
            text={
              push.state === "on"
                ? "On — this device gets reminders through the server, even with the app closed. With no internet they arrive once it reconnects."
                : push.state === "unsupported"
                  ? "This browser can't receive push. On iPhone, install the app to the Home Screen first. Reminders still come while the app is open."
                  : push.state === "blocked"
                    ? "Blocked in the browser's site settings."
                    : "Off — reminders only come while the app is open."
            }
          >
            <Switch
              checked={push.state === "on"}
              disabled={
                !on ||
                push.state === null ||
                push.state === "unsupported" ||
                push.state === "blocked"
              }
              onCheckedChange={(v) => void togglePush(v)}
              aria-label="Reminders when the app is closed"
            />
          </Row>

          <fieldset disabled={!on} className="space-y-5 disabled:opacity-50">
            <Field label="Repeat reminder for each pending task">
              <RepeatPicker
                settings={s}
                onChange={(patch) => update.mutate(patch)}
              />
            </Field>

            <Row
              title="Overdue boost"
              text="Overdue tasks remind twice as often."
            >
              <Switch
                checked={s.overdueBoost === "on"}
                onCheckedChange={(v) =>
                  update.mutate({ overdueBoost: v ? "on" : "off" })
                }
                aria-label="Overdue boost"
              />
            </Row>

            <div className="space-y-3">
              <Row
                title="Quiet hours"
                text={
                  s.quietHours && inQuietHours(s)
                    ? "Quiet right now — reminders resume after."
                    : "No reminders during this time (e.g. at night)."
                }
              >
                <Switch
                  checked={!!s.quietHours}
                  onCheckedChange={(v) =>
                    update.mutate({
                      quietHours: v ? { from: "22:00", to: "07:00" } : null,
                    })
                  }
                  aria-label="Quiet hours"
                />
              </Row>
              {s.quietHours && (
                <div className="grid max-w-sm grid-cols-2 gap-3">
                  <Field label="From" htmlFor="q-from">
                    <TimeInput
                      id="q-from"
                      clearable={false}
                      value={s.quietHours.from}
                      onChange={(v) =>
                        update.mutate({
                          quietHours: {
                            ...s.quietHours!,
                            from: v,
                          },
                        })
                      }
                    />
                  </Field>
                  <Field label="To" htmlFor="q-to">
                    <TimeInput
                      id="q-to"
                      clearable={false}
                      value={s.quietHours.to}
                      onChange={(v) =>
                        update.mutate({
                          quietHours: { ...s.quietHours!, to: v },
                        })
                      }
                    />
                  </Field>
                </div>
              )}
            </div>

            <Button variant="outline" onClick={remindNow}>
              <BellRing /> Remind me about pending work now
            </Button>
          </fieldset>

          <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
            With “When the app is closed” on, the server sends reminders to this
            device even when Task Uncle is closed; with no internet, the open
            app reminds from what is saved on the device, and an installed app
            (Chrome) also checks in the background now and then. Tip: on phones,
            use “Add to Home screen”. Each task can override the interval (or
            turn reminders off) from its edit form.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Moon className="size-4.5 text-primary" /> Appearance
          </span>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-medium",
                theme === t.value
                  ? "border-primary bg-accent text-accent-foreground"
                  : "hover:bg-muted",
              )}
            >
              <t.icon className="size-5" />
              {t.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <User className="size-4.5 text-primary" /> Account
          </span>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="App">
        <div className="space-y-5">
          <Row
            title="Keyboard shortcuts"
            text="Press ? anywhere to see them all."
          >
            <Button variant="outline" onClick={() => setShortcutsOpen(true)}>
              <ShortcutKeys binding="?" /> Show
            </Button>
          </Row>
          <Row
            title="Install Task Uncle"
            text="Opens like an app, works offline and syncs when you're back online."
          >
            <InstallButton className="w-auto" fallback="Installed" />
          </Row>
        </div>
      </SectionCard>

      <SectionCard title="Data">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportBackup}>
            <Download /> Export backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload /> Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              replaceAll("Reset to demo data?", () =>
                callMsg(api.backup["reset-demo"].post()),
              )
            }
          >
            <RotateCcw /> Reset demo data
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

const CHOICE =
  "rounded-xl border px-3 py-3 text-sm font-medium transition-colors";
const CHOSEN =
  "border-primary bg-accent text-accent-foreground ring-2 ring-primary/20";
const QUICK = [15, 30, 45, 90, 120, 180];

/** The four presets plus a custom repeat (hours + minutes). */
function RepeatPicker({
  settings: s,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const custom = s.customMinutes;
  const [open, setOpen] = useState(custom !== null);
  const [hours, setHours] = useState(String(Math.floor((custom ?? 30) / 60)));
  const [mins, setMins] = useState(String((custom ?? 30) % 60));
  const total = (Number(hours) || 0) * 60 + (Number(mins) || 0);
  const invalid = total < CUSTOM_MINUTES_MIN || total > CUSTOM_MINUTES_MAX;
  const unchanged = custom === total;

  const pick = (m: number) => {
    setHours(String(Math.floor(m / 60)));
    setMins(String(m % 60));
  };
  const save = () => {
    if (invalid) return;
    onChange({ customMinutes: total });
    toast.success(
      `Pending tasks will remind ${everyLabel(total).toLowerCase()}`,
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {INTERVALS.map((i) => (
          <button
            key={i.value}
            type="button"
            onClick={() => {
              setOpen(false);
              onChange({ interval: i.value, customMinutes: null });
            }}
            className={cn(
              CHOICE,
              custom === null && !open && s.interval === i.value
                ? CHOSEN
                : "hover:bg-muted",
            )}
          >
            {i.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            CHOICE,
            "col-span-2 sm:col-span-1",
            custom !== null || open ? CHOSEN : "hover:bg-muted",
          )}
        >
          {custom !== null ? everyLabel(custom) : "Custom"}
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Hours
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={168}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-20"
                aria-label="Custom repeat hours"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Minutes
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                step={5}
                value={mins}
                onChange={(e) => setMins(e.target.value)}
                className="w-20"
                aria-label="Custom repeat minutes"
              />
            </label>
            <Button onClick={save} disabled={invalid || unchanged}>
              {unchanged ? "Saved" : "Save"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pick(m)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  total === m
                    ? "border-primary bg-accent text-accent-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                {everyLabel(m).replace("Every ", "")}
              </button>
            ))}
          </div>
          <p
            className={cn(
              "text-xs",
              invalid ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {invalid
              ? `Choose between ${CUSTOM_MINUTES_MIN} minutes and 7 days.`
              : `${everyLabel(total)} for every pending task (tasks with their own interval keep it).`}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      {children}
    </div>
  );
}
