import {
  Bell,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Settings,
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
