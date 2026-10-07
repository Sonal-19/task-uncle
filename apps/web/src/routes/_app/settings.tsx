import { useQueryClient } from "@tanstack/react-query";
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
import { useRef } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/app/section-card";
import { THEMES } from "@/components/app/user-menu";
import { confirm } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { PageLoader } from "@/components/common/states";
import { TimeInput } from "@/components/common/time-input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { keys, useSettings, useUpdateSettings } from "@/hooks/use-data";
import { usePermission } from "@/hooks/use-permission";
import { runReminderCheck } from "@/hooks/use-reminders";
import { mockApi } from "@/lib/mock-api";
import { showNotification } from "@/lib/reminders/notify";
import { inQuietHours } from "@/lib/reminders/reminder-engine";
import { INTERVALS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";

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
  const { theme, setTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  if (settingsQ.isLoading || !settingsQ.data) return <PageLoader />;
  const s = settingsQ.data;
  const on = s.notifications === "on";
  const refresh = () => qc.invalidateQueries({ queryKey: keys.all });

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
    await showNotification({
      title: "🔔 Test from Task Uncle",
      body: "This is how your pending-task reminders will look.",
      tag: "test",
    });
    toast.success("Test notification sent");
  }

  async function remindNow() {
    // Treat every pending task as due, then run the engine once.
    const { tasks } = mockApi.exportData();
    mockApi.markReminded(
      tasks.filter((t) => t.status !== "done").map((t) => t.id),
      new Date(0).toISOString(),
    );
    const n = await runReminderCheck();
    refresh();
    toast.info(
      n
        ? `Sent reminders for ${n} pending tasks`
        : "No reminders due (quiet hours or off?)",
    );
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(mockApi.exportData(), null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `task-uncle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importBackup(file: File) {
    try {
      await mockApi.importData(JSON.parse(await file.text()));
      refresh();
      toast.success("Backup restored");
    } catch (e) {
      toast.error((e as Error).message || "Could not read that file");
    }
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

          <fieldset disabled={!on} className="space-y-5 disabled:opacity-50">
            <Field label="Repeat reminder for each pending task">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {INTERVALS.map((i) => (
                  <button
                    key={i.value}
                    type="button"
                    onClick={() => update.mutate({ interval: i.value })}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                      s.interval === i.value
                        ? "border-primary bg-accent text-accent-foreground ring-2 ring-primary/20"
                        : "hover:bg-muted",
                    )}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
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
            Reminders are sent while Task Uncle is open in a tab or installed as
            an app. Tip: on phones, use “Add to Home screen”. Each task can
            override the interval (or turn reminders off) from its edit form.
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
        <p className="mt-3 text-xs text-muted-foreground">
          Demo account — profile editing arrives with the real backend.
        </p>
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
            onClick={async () => {
              if (
                await confirm({
                  title: "Reset to demo data?",
                  description:
                    "All your events, tasks and people are replaced.",
                  confirmText: "Reset",
                  destructive: true,
                })
              ) {
                await mockApi.resetDemo();
                refresh();
                toast.success("Demo data restored");
              }
            }}
          >
            <RotateCcw /> Reset demo data
          </Button>
        </div>
      </SectionCard>
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
