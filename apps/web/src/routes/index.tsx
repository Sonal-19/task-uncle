import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  IndianRupee,
  ListChecks,
  Moon,
  MoonStar,
  Search,
  Smartphone,
  Sun,
  Tags,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { Logo } from "@/components/common/logo";
import { AuthCard } from "@/components/landing/auth-card";
import { NotificationStack } from "@/components/landing/notification-stack";
import { Button } from "@/components/ui/button";
import { homeFor, useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";

export const Route = createFileRoute("/")({
  component: Landing,
});

const STEPS = [
  {
    icon: FolderKanban,
    title: "Create an event",
    text: "A project or area of life — Shimlawale CRM, Khalsa Virasat, Personal.",
  },
  {
    icon: Tags,
    title: "Add categories",
    text: "Group the work: GST, CA, YouTube, Calls, or a Developer team.",
  },
  {
    icon: ListChecks,
    title: "Add tasks",
    text: "With date & time, priority, who it's assigned to and any pending payment.",
  },
  {
    icon: BellRing,
    title: "Uncle reminds you",
    text: "Every hour, 5h, 12h or daily — until you mark it done. Finish time is saved.",
  },
];

const FEATURES = [
  {
    icon: BellRing,
    title: "Repeat reminders",
    text: "Browser notifications that keep coming for every pending task.",
  },
  {
    icon: AlarmClock,
    title: "Snooze & quiet hours",
    text: "Snooze from the notification; no pings at night.",
  },
  {
    icon: Users,
    title: "Teams & people",
    text: "Make a developer team, assign work, see who has what pending.",
  },
  {
    icon: IndianRupee,
    title: "Pending payments",
    text: "Note what you owe on a task — totals per event and per person.",
  },
  {
    icon: CalendarDays,
    title: "Calendar view",
    text: "See what's due each day of the month at a glance.",
  },
  {
    icon: CheckCircle2,
    title: "Done with a timestamp",
    text: "Mark done manually; the completion date and time is recorded.",
  },
  {
    icon: Search,
    title: "Search everything",
    text: "⌘K to jump to any task, event or category instantly.",
  },
  {
    icon: Smartphone,
    title: "Feels like an app",
    text: "Install on your phone — bottom tabs, swipe to finish, offline-ready.",
  },
];

const EXAMPLE = [
  {
    name: "Shimlawale CRM",
    color: "#4f46e5",
    cats: [
      { name: "Meetings", pending: 1 },
      { name: "Design", pending: 1 },
      { name: "Domain", pending: 2 },
      { name: "Developer team", pending: 2 },
      { name: "Launch · 9 Oct", pending: 1 },
      { name: "Payments", pending: 2 },
    ],
  },
  {
    name: "Khalsa Virasat",
    color: "#d97706",
    cats: [
      { name: "GST", pending: 2 },
      { name: "CA", pending: 3 },
      { name: "YouTube", pending: 3 },
      { name: "Calls (raagi)", pending: 2 },
    ],
  },
];

function Landing() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-dvh overflow-x-hidden">
      {/* Header */}
      <header className="pt-safe sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(dark ? "light" : "dark")}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            {user ? (
              <Button asChild size="sm">
                <Link to={homeFor(user)}>Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <a href="#login">Log in</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="bg-dot-pattern pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 pb-16 md:px-8 md:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-amber opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-amber" />
              </span>
              Your pending-work uncle
            </span>
            <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Uncle won't stop reminding you{" "}
              <span className="text-gradient-primary">until it's done.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
              Add your professional and personal work by event and category.
              Every pending task keeps sending you browser notifications — on
              your schedule — until you mark it finished.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg">
                {user ? (
                  <Link to={homeFor(user)}>
                    Open dashboard <ArrowRight />
                  </Link>
                ) : (
                  <a href="#login">
                    Get started <ArrowRight />
                  </a>
                )}
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <div className="mt-10 hidden lg:block">
              <NotificationStack />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto w-full max-w-md"
          >
            <AuthCard />
          </motion.div>

          <div className="lg:hidden">
            <NotificationStack />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-y bg-card/60 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <SectionHead
            kicker="How it works"
            title="Event → Category → Task → Reminder"
            text="Everything is added by you, by hand. The only automatic part is Uncle nagging you about what's still pending."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="relative rounded-2xl border bg-card p-5"
              >
                <span className="absolute top-4 right-4 text-4xl font-extrabold text-muted/80">
                  {i + 1}
                </span>
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <s.icon className="size-5" />
                </span>
                <p className="mt-4 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>

          {/* Example tree */}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {EXAMPLE.map((ev) => (
              <div key={ev.name} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: ev.color }}
                  />
                  <p className="font-semibold">{ev.name}</p>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {ev.cats.reduce((s, c) => s + c.pending, 0)} pending
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {ev.cats.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                    >
                      {c.name}
                      <span
                        className="grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white"
                        style={{ backgroundColor: ev.color }}
                      >
                        {c.pending}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <SectionHead
            kicker="Features"
            title="Small app, serious nagging"
            text="Built for people juggling projects, accounts, teams and family — all in one list."
          />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border bg-card p-5 transition-shadow hover:shadow-lg"
              >
                <f.icon className="size-6 text-primary" />
                <p className="mt-3 font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16 md:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 py-12 text-center text-white">
          <div className="bg-dot-pattern pointer-events-none absolute inset-0 opacity-30" />
          <MoonStar className="mx-auto size-8 text-amber-300" />
          <h2 className="relative mt-3 text-2xl font-extrabold sm:text-3xl">
            Clear your pending list before Uncle calls again.
          </h2>
          <Button
            asChild
            size="lg"
            className="relative mt-6 bg-white text-indigo-700 hover:bg-indigo-50"
          >
            {user ? (
              <Link to={homeFor(user)}>
                Open dashboard <ArrowRight />
              </Link>
            ) : (
              <a href="#login">
                Log in now <ArrowRight />
              </a>
            )}
          </Button>
        </div>
      </section>

      <footer className="pb-safe border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row md:px-8">
          <Logo className="scale-90" />
          <p>© {new Date().getFullYear()} Task Uncle. Made with chai ☕</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">
        {kicker}
      </p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-muted-foreground">{text}</p>
    </div>
  );
}
