import { addDays, format, subDays, subHours } from "date-fns";
import {
  type Category,
  type DataState,
  DEFAULT_SETTINGS,
  type NotificationLog,
  type Person,
  type Task,
  type TaskEvent,
} from "$/lib/shared/types";

/** Demo data, dated relative to `now` so there is always something overdue,
 * due today and upcoming. Ids are readable placeholders: `replaceAll`
 * swaps every one for a fresh UUID when it is saved. */
export function buildSeed(now = new Date()): DataState {
  const day = (offset: number) =>
    format(
      offset >= 0 ? addDays(now, offset) : subDays(now, -offset),
      "yyyy-MM-dd",
    );
  const ago = (hours: number) => subHours(now, hours).toISOString();
  const created = ago(24 * 6);

  const events: TaskEvent[] = [
    {
      id: "ev-shimla",
      name: "Shimlawale CRM",
      description: "New CRM project — design, domain, developers and go-live.",
      color: "#4f46e5",
      icon: "rocket",
      dueDate: day(3),
      status: "active",
      archivedAt: null,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: "ev-khalsa",
      name: "Khalsa Virasat",
      description: "GST, CA, YouTube channel and calls with raagi jathas.",
      color: "#d97706",
      icon: "music",
      dueDate: null,
      status: "active",
      archivedAt: null,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: "ev-personal",
      name: "Personal",
      description: "Home, family and everyday errands.",
      color: "#16a34a",
      icon: "home",
      dueDate: null,
      status: "active",
      archivedAt: null,
      createdAt: created,
      updatedAt: created,
    },
  ];

  const person = (
    id: string,
    name: string,
    role: string,
    phone = "",
  ): Person => ({
    id,
    name,
    role,
    phone,
    note: "",
    createdAt: created,
    updatedAt: created,
  });
  const people: Person[] = [
    person("p-aman", "Aman Verma", "Frontend developer", "+91 98765 43210"),
    person("p-rohit", "Rohit Sharma", "Backend developer", "+91 98123 45678"),
    person("p-neha", "Neha Kapoor", "UI/UX designer", "+91 99887 76655"),
    person(
      "p-ca",
      "CA Gurpreet Singh",
      "Chartered accountant",
      "+91 98140 11223",
    ),
    person("p-raagi", "Bhai Harjinder Singh Ji", "Raagi", "+91 98556 77889"),
    person("p-editor", "Jaspreet", "Video editor"),
  ];

  const cat = (
    id: string,
    eventId: string,
    name: string,
    icon: string,
    color: string,
    memberIds: string[] = [],
  ): Category => ({
    id,
    eventId,
    name,
    icon,
    color,
    kind: memberIds.length ? "team" : "general",
    memberIds,
    createdAt: created,
    updatedAt: created,
  });
  const categories: Category[] = [
    cat("c-meet", "ev-shimla", "Meetings", "calendar", "#0284c7"),
    cat("c-design", "ev-shimla", "Design", "palette", "#db2777"),
    cat("c-domain", "ev-shimla", "Domain & hosting", "globe", "#0d9488"),
    cat("c-devteam", "ev-shimla", "Developer team", "code", "#4f46e5", [
      "p-aman",
      "p-rohit",
      "p-neha",
    ]),
    cat("c-launch", "ev-shimla", "Launch", "rocket", "#ea580c"),
    cat("c-payments", "ev-shimla", "Payments", "banknote", "#16a34a"),
    cat("c-gst", "ev-khalsa", "GST", "receipt", "#e11d48"),
    cat("c-ca", "ev-khalsa", "CA", "briefcase", "#7c3aed", ["p-ca"]),
    cat("c-yt", "ev-khalsa", "YouTube", "youtube", "#dc2626", ["p-editor"]),
    cat("c-calls", "ev-khalsa", "Calls & meetings", "phone", "#0284c7"),
    cat("c-home", "ev-personal", "Home", "home", "#16a34a"),
    cat("c-family", "ev-personal", "Family", "heart", "#db2777"),
    cat("c-shop", "ev-personal", "Shopping", "cart", "#d97706"),
  ];

  const eventOf = Object.fromEntries(categories.map((c) => [c.id, c.eventId]));
  const task = (
    id: string,
    categoryId: string,
    title: string,
    t: Partial<Task> = {},
  ): Task => ({
    id,
    eventId: eventOf[categoryId] ?? "",
    categoryId,
    title,
    notes: "",
    status: "pending",
    priority: "medium",
    dueDate: null,
    dueTime: null,
    assigneeId: null,
    amount: null,
    subtasks: [],
    reminder: "inherit",
    snoozedUntil: null,
    lastRemindedAt: null,
    createdAt: created,
    updatedAt: created,
    startedAt: null,
    completedAt: null,
    ...t,
  });
  const done = (hoursAgo: number): Partial<Task> => ({
    status: "done",
    completedAt: ago(hoursAgo),
    updatedAt: ago(hoursAgo),
  });
  const sub = (title: string, isDone = false) => ({
    id: `${title.slice(0, 6)}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    doneAt: isDone ? ago(20) : null,
  });

  const tasks: Task[] = [
    // Shimlawale CRM
    task("t1", "c-meet", "Meet the developer team", {
      priority: "high",
      dueDate: day(0),
      dueTime: "11:00",
      notes: "Kick-off: scope, timeline, who does what.",
      subtasks: [sub("Share requirement doc", true), sub("Fix sprint dates")],
    }),
    task("t2", "c-design", "Make the design of the CRM", {
      status: "in_progress",
      startedAt: ago(48),
      priority: "high",
      dueDate: day(1),
      dueTime: "18:00",
      assigneeId: "p-neha",
      subtasks: [
        sub("Dashboard screens", true),
        sub("Lead detail page"),
        sub("Mobile layouts"),
      ],
    }),
    task("t3", "c-domain", "Buy the domain shimlawale.com", {
      priority: "urgent",
      dueDate: day(-1),
      dueTime: "17:00",
      amount: 120000,
    }),
    task("t4", "c-domain", "Set up hosting & SSL", { dueDate: day(2) }),
    task("t5", "c-devteam", "Build lead management module", {
      status: "in_progress",
      startedAt: ago(30),
      assigneeId: "p-rohit",
      dueDate: day(2),
      priority: "high",
    }),
    task("t6", "c-devteam", "Build dashboard UI", {
      assigneeId: "p-aman",
      dueDate: day(2),
    }),
    task("t7", "c-devteam", "Set up project repository", {
      assigneeId: "p-rohit",
      ...done(52),
    }),
    task("t8", "c-launch", "Make Shimlawale CRM live", {
      priority: "urgent",
      dueDate: day(3),
      dueTime: "10:00",
      subtasks: [sub("Final QA"), sub("Point DNS"), sub("Announce to client")],
    }),
    task("t9", "c-payments", "Pay Aman — frontend milestone", {
      assigneeId: "p-aman",
      amount: 2500000,
      dueDate: day(4),
    }),
    task("t10", "c-payments", "Pay Rohit — backend milestone", {
      assigneeId: "p-rohit",
      amount: 3000000,
      dueDate: day(4),
    }),
    task("t11", "c-payments", "Pay Neha — design advance", {
      assigneeId: "p-neha",
      amount: 1000000,
      ...done(70),
    }),

    // Khalsa Virasat
    task("t12", "c-gst", "File GSTR-3B for September", {
      priority: "urgent",
      dueDate: day(-2),
      notes: "Late fee applies after the 20th.",
    }),
    task("t13", "c-gst", "Reconcile purchase invoices", { dueDate: day(5) }),
    task("t14", "c-ca", "Send bank statements to CA", {
      assigneeId: "p-ca",
      priority: "high",
      dueDate: day(0),
      dueTime: "16:30",
    }),
    task("t15", "c-ca", "Collect audit report", {
      assigneeId: "p-ca",
      dueDate: day(6),
    }),
    task("t16", "c-ca", "Pay CA fees", {
      assigneeId: "p-ca",
      amount: 1500000,
      dueDate: day(7),
    }),
    task("t17", "c-ca", "Sign ITR documents", {
      ...done(26),
      assigneeId: "p-ca",
    }),
    task("t18", "c-yt", "Pending music of shabad “Mitar Pyare Nu”", {
      assigneeId: "p-editor",
      priority: "high",
      dueDate: day(1),
    }),
    task("t19", "c-yt", "Edit Gurpurab kirtan video", {
      status: "in_progress",
      startedAt: ago(10),
      assigneeId: "p-editor",
      dueDate: day(3),
    }),
    task("t20", "c-yt", "Design thumbnails for 3 shabads", { dueDate: day(5) }),
    task("t21", "c-yt", "Upload “Asa Di Vaar” recording", { ...done(8) }),
    task("t22", "c-calls", "Meet raagi — give time for meeting", {
      assigneeId: "p-raagi",
      priority: "high",
      dueDate: day(1),
      dueTime: "15:00",
      notes: "Called on Monday; wants to discuss recording schedule.",
    }),
    task("t23", "c-calls", "Call back sound engineer", { dueDate: day(-1) }),

    // Personal
    task("t24", "c-home", "Pay electricity bill", {
      amount: 342000,
      dueDate: day(0),
      dueTime: "20:00",
    }),
    task("t25", "c-family", "Book train tickets for Amritsar", {
      dueDate: day(2),
    }),
    task("t26", "c-shop", "Buy groceries", { priority: "low", ...done(4) }),
  ];

  const log: NotificationLog[] = [
    {
      id: "n1",
      taskId: "t3",
      title: "Overdue: Buy the domain shimlawale.com",
      body: "Shimlawale CRM · Domain & hosting",
      sentAt: ago(1),
      readAt: null,
    },
    {
      id: "n2",
      taskId: "t12",
      title: "Overdue: File GSTR-3B for September",
      body: "Khalsa Virasat · GST",
      sentAt: ago(2),
      readAt: null,
    },
    {
      id: "n3",
      taskId: null,
      title: "You have 18 pending tasks",
      body: "3 overdue · 4 due today",
      sentAt: ago(3),
      readAt: ago(2),
    },
  ];

  return {
    events,
    categories,
    people,
    tasks,
    settings: DEFAULT_SETTINGS,
    log,
  };
}
