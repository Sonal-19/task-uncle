import {
  Bell,
  BellRing,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  MonitorSmartphone,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

export const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: FolderKanban },
  { to: "/tasks", label: "All tasks", icon: ListTodo },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/people", label: "People", icon: Users },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/** The admin panel's pages. `tab` = in the phone's bottom bar (the rest
 * are under More). */
export const ADMIN_NAV = [
  {
    to: "/admin",
    label: "Overview",
    icon: ShieldCheck,
    exact: true,
    tab: true,
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: UserCog,
    exact: false,
    tab: true,
  },
  {
    to: "/admin/tasks",
    label: "All tasks",
    icon: ListTodo,
    exact: false,
    tab: true,
  },
  {
    to: "/admin/devices",
    label: "Devices",
    icon: MonitorSmartphone,
    exact: false,
    tab: false,
  },
  {
    to: "/admin/reminders",
    label: "Reminders log",
    icon: BellRing,
    exact: false,
    tab: false,
  },
] as const;
