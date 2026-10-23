// Keyboard shortcuts: the actions and their keys.
//
// Binding syntax: keys joined by "+", steps of a sequence separated by a
// space. `mod` is ⌘ on macOS and Ctrl elsewhere.
//   "n"           press n
//   "shift+n"     press Shift+N
//   "g d"         press g, then d (within a second)
//   "mod+enter"   ⌘/Ctrl+Enter
// Symbols are written as typed ("?", not "shift+/").

export const SHORTCUT_GROUPS = ["Create", "Go to", "App"] as const;
export type ShortcutGroup = (typeof SHORTCUT_GROUPS)[number];

export const SHORTCUT_ACTIONS = [
  { id: "addTask", label: "Add task", group: "Create", key: "n" },
  { id: "addEvent", label: "Add event", group: "Create", key: "shift+n" },
  { id: "addPerson", label: "Add person", group: "Create", key: "shift+p" },
  { id: "goDashboard", label: "Dashboard", group: "Go to", key: "g d" },
  { id: "goTasks", label: "All tasks", group: "Go to", key: "g t" },
  { id: "goEvents", label: "Events", group: "Go to", key: "g e" },
  { id: "goCalendar", label: "Calendar", group: "Go to", key: "g c" },
  { id: "goPeople", label: "People", group: "Go to", key: "g p" },
  { id: "goNotifications", label: "Notifications", group: "Go to", key: "g n" },
  { id: "goSettings", label: "Settings", group: "Go to", key: "g s" },
  { id: "search", label: "Search", group: "App", key: "/" },
  { id: "syncNow", label: "Sync now", group: "App", key: "shift+r" },
  { id: "showShortcuts", label: "Show shortcuts", group: "App", key: "?" },
  {
    id: "submitForm",
    label: "Save the open form",
    group: "App",
    key: "mod+enter",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  group: ShortcutGroup;
  key: string;
}[];

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]["id"];

export const SHORTCUTS = Object.fromEntries(
  SHORTCUT_ACTIONS.map((a) => [a.id, a.key]),
) as Record<ShortcutAction, string>;
