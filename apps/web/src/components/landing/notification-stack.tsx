import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const SAMPLES = [
  {
    title: "Overdue: Buy the domain",
    body: "Shimlawale CRM · Domain & hosting",
    when: "now",
  },
  {
    title: "Pending: Send bank statements to CA",
    body: "Khalsa Virasat · CA",
    when: "1h ago",
  },
  {
    title: "Pending: Music of shabad",
    body: "Khalsa Virasat · YouTube",
    when: "2h ago",
  },
  {
    title: "Pending: Meet raagi at 3:00 PM",
    body: "Khalsa Virasat · Calls",
    when: "5h ago",
  },
  {
    title: "Pending: Pay Rohit — backend milestone",
    body: "Shimlawale CRM · Payments",
    when: "12h ago",
  },
];

/** A phone-style stack of reminders that keeps cycling, like the real thing. */
export function NotificationStack() {
  const [start, setStart] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(
      () => setStart((s) => (s + 1) % SAMPLES.length),
      2800,
    );
    return () => clearInterval(t);
  }, []);
  const visible = [0, 1, 2].map((i) => SAMPLES[(start + i) % SAMPLES.length]!);

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-amber-400/25 blur-2xl" />
      <div className="space-y-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((n, i) => (
            <motion.div
              key={n.title}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1 - i * 0.22, y: 0, scale: 1 - i * 0.03 }}
              exit={{ opacity: 0, y: 24, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="flex items-start gap-3 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur"
            >
              <img
                src="/logo.svg"
                alt=""
                className="size-9 shrink-0 rounded-[10px]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Task Uncle
                  </p>
                  <p className="text-[11px] text-muted-foreground">{n.when}</p>
                </div>
                <p className="truncate text-sm font-semibold">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {n.body}
                </p>
                {i === 0 && (
                  <div className="mt-2 flex gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-done/15 px-2 py-1 text-done">
                      ✓ Mark done
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
                      Snooze 1h
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
