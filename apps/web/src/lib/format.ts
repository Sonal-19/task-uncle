import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  parse,
  parseISO,
  subDays,
} from "date-fns";
import {
  isRoutine,
  nextOccurrence,
  occurrencesUpTo,
  routineDay,
  routineLabel,
  routineStart,
  type Task,
} from "./types";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Amounts are integers in paise everywhere; this is the one place they become text. */
export const formatAmount = (value?: number | null) =>
  inrFormatter.format((value ?? 0) / 100);
/** ₹1.2L / ₹12K */
export const formatAmountShort = (value?: number | null) =>
  inrCompact.format((value ?? 0) / 100);
/** Rupees typed in a form → paise. */
export const toAmount = (rupees: number) => Math.round(rupees * 100);
/** Paise → rupees, for prefilling inputs. */
export const fromAmount = (value: number) => value / 100;

export function ymd(d: string | Date) {
  return d instanceof Date ? format(d, "yyyy-MM-dd") : d.slice(0, 10);
}

/** Local "today" as yyyy-MM-dd. */
export const todayStr = () => format(new Date(), "yyyy-MM-dd");

export const parseDay = (d: string | Date) => parseISO(ymd(d));

/** Date-only value → "dd/MM/yyyy" (the Indian numeric format). */
export const formatDate = (d: string | Date) =>
  format(parseDay(d), "dd/MM/yyyy");

export const shortDate = (d: string | Date) =>
  format(parseDay(d), "d MMM yyyy");

/** "16:30" → "4:30 PM" */
export const formatTime = (t: string) =>
  format(parse(t, "HH:mm", new Date()), "h:mm a");

/** ISO timestamp → "6 Oct 2026, 4:30 PM" */
export const formatDateTime = (iso: string) =>
  format(parseISO(iso), "d MMM yyyy, h:mm a");

export const timeAgo = (iso: string) =>
  formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });

/** A future moment → "in 3 hours" / "Tomorrow, 7:00 AM". */
export function formatUpcoming(d: Date) {
  const ms = d.getTime() - Date.now();
  if (ms < 90_000) return "in a minute";
  if (ms < 6 * 3_600_000)
    return formatDistanceToNowStrict(d, { addSuffix: true });
  return `${dayLabel(ymd(d))}, ${format(d, "h:mm a")}`;
}

export function dayLabel(d: string) {
  const diff = differenceInCalendarDays(parseDay(d), new Date());
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return format(parseDay(d), "EEE, d MMM");
}

/** When the task is due, as a Date (end of day when there is no time). */
export function dueAt(t: Pick<Task, "dueDate" | "dueTime">) {
  if (!t.dueDate) return null;
  return parse(
    `${t.dueDate} ${t.dueTime ?? "23:59"}`,
    "yyyy-MM-dd HH:mm",
    new Date(),
  );
}

export function isOverdue(t: Task, now = new Date()) {
  const d = dueAt(t);
  return t.status !== "done" && !!d && d < now;
}

/** A routine counts as due today while its occurrence is open. */
export const isDueToday = (t: Task) =>
  t.status !== "done" &&
  (isRoutine(t) ? !doneNow(t) && !notStarted(t) : t.dueDate === todayStr());

/** The occurrence a routine's check ticks now (yyyy-MM-dd). */
export const routineNow = (t: Task) => routineDay(t, todayStr());

/** A routine whose current occurrence is ticked off. */
export const doneNow = (t: Task) =>
  isRoutine(t) && t.doneDates.includes(routineNow(t));

/** A routine whose first occurrence is still ahead. */
export const notStarted = (t: Task) =>
  isRoutine(t) && routineStart(t) > todayStr();

/** A routine's next occurrence after the current one. */
export const nextRoutineDay = (t: Task) => nextOccurrence(t, routineNow(t));

/** Days a routine's open occurrence has waited (0 = it came today). */
export function routineLate(t: Task) {
  if (!isRoutine(t) || doneNow(t) || notStarted(t)) return 0;
  return differenceInCalendarDays(new Date(), parseDay(routineNow(t)));
}

/** A routine every single day (shown day by day). */
export const isEveryDay = (t: Task) =>
  t.repeat === "daily" && t.repeatEvery === 1;

/** The last `n` days, today first (yyyy-MM-dd). */
export const lastDays = (n: number, from = new Date()) =>
  Array.from({ length: n }, (_, i) => format(subDays(from, i), "yyyy-MM-dd"));

/** Occurrences in a row a routine was done, up to the current one (which,
 * still open, doesn't break it). */
export function streakOf(t: Task) {
  const done = new Set(t.doneDates);
  const occ = occurrencesUpTo(t, todayStr(), t.doneDates.length + 1);
  if (occ[0] && !done.has(occ[0])) occ.shift();
  let n = 0;
  for (const d of occ) {
    if (!done.has(d)) break;
    n++;
  }
  return n;
}

/** "day" / "week" / "month" a routine's streak counts in. */
export function streakUnit(t: Task, n: number) {
  const unit = isEveryDay(t)
    ? "day"
    : t.repeat === "weekly" && t.repeatEvery === 1
      ? "week"
      : t.repeat === "monthly" && t.repeatEvery === 1
        ? "month"
        : "time";
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** What a routine row says: "Done today", "Done · next Fri, 7 Nov",
 * "Due today", "Due since Mon · 3 days", "Starts Mon, 3 Nov". */
export function routineStatus(t: Task) {
  if (notStarted(t)) return `Starts ${inSentence(routineStart(t))}`;
  if (doneNow(t))
    return isEveryDay(t)
      ? "Done today"
      : `Done · next ${inSentence(nextRoutineDay(t))}`;
  const late = routineLate(t);
  // An every-day routine shows its time instead.
  if (!late) return isEveryDay(t) ? null : "Due today";
  return `Due since ${inSentence(routineNow(t))} · ${late} day${late === 1 ? "" : "s"}`;
}

/** `dayLabel` inside a sentence ("tomorrow", "Fri, 7 Nov"). */
const inSentence = (d: string) => {
  const l = dayLabel(d);
  return l.includes(",") ? l : l.toLowerCase();
};

/** "Today, 4:30 PM" / "Overdue · 2 days" / "Fri, 9 Oct" / "Every day, 11:00 AM" */
export function formatDue(t: Task) {
  if (isRoutine(t)) return `${routineLabel(t)}, ${formatTime(t.repeatTime!)}`;
  if (!t.dueDate) return "No due date";
  const time = t.dueTime ? `, ${formatTime(t.dueTime)}` : "";
  if (isOverdue(t)) {
    const days = differenceInCalendarDays(new Date(), parseDay(t.dueDate));
    return days === 0
      ? `Overdue · today${time}`
      : `Overdue · ${days} day${days === 1 ? "" : "s"}`;
  }
  return `${dayLabel(t.dueDate)}${time}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
