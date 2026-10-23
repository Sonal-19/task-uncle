import { Link } from "@tanstack/react-router";
import { LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { Avatar } from "@/components/common/badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-auth";
import type { AppUser } from "@/stores/auth-store";
import { type Theme, useThemeStore } from "@/stores/theme-store";

export const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function UserMenu({
  user,
  settings = true,
}: {
  user: AppUser;
  /** The Settings link (task-app settings; hidden for admins). */
  settings?: boolean;
}) {
  const logout = useLogout();
  const { theme, setTheme } = useThemeStore();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account menu"
      >
        <Avatar name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex gap-1 p-1">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-xs ${theme === t.value ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        {settings && (
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings /> Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
