import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, call, callMsg } from "@/lib/api";
import type { OnOff, Priority, UserRole, UserStatus } from "@/lib/types";

// Admin data needs a connection (it reads across all users), so these call
// the API directly instead of going through the offline outbox. Keys start
// with "tu" so logout clears them with everything else.

export const adminKeys = {
  all: ["tu", "admin"] as const,
  overview: ["tu", "admin", "overview"] as const,
  users: (f: UserFilters) => ["tu", "admin", "users", f] as const,
  user: (id: number) => ["tu", "admin", "user", id] as const,
  tasks: (f: TaskFilters) => ["tu", "admin", "tasks", f] as const,
  sessions: ["tu", "admin", "sessions"] as const,
  reminders: (userId?: number) =>
    ["tu", "admin", "reminders", userId ?? null] as const,
};

export type AdminTaskStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "overdue"
  | "all";
export type TaskFilters = {
  status?: AdminTaskStatus;
  userId?: number;
  priority?: Priority;
  q?: string;
  page?: number;
};

export type UserFilters = { q?: string; role?: UserRole; status?: UserStatus };

const fetchOverview = () => call(api.admin.overview.get());
const fetchUsers = (f: UserFilters) => call(api.admin.users.get({ query: f }));
const fetchUser = (id: number) => call(api.admin.users({ id }).get());
const fetchTasks = (f: TaskFilters) => call(api.admin.tasks.get({ query: f }));
const fetchSessions = () => call(api.admin.sessions.get());
const fetchReminders = (userId?: number) =>
  call(api.admin.reminders.get({ query: userId ? { userId } : {} }));

export type AdminOverview = Awaited<ReturnType<typeof fetchOverview>>;
export type AdminUserRow = Awaited<ReturnType<typeof fetchUsers>>[number];
export type AdminUserDetail = Awaited<ReturnType<typeof fetchUser>>;
export type AdminTaskPage = Awaited<ReturnType<typeof fetchTasks>>;
export type AdminSession = Awaited<ReturnType<typeof fetchSessions>>[number];

export const useAdminTasks = (f: TaskFilters) =>
  useQuery({
    queryKey: adminKeys.tasks(f),
    queryFn: () => fetchTasks(f),
    placeholderData: keepPreviousData,
  });

export const useAdminSessions = () =>
  useQuery({ queryKey: adminKeys.sessions, queryFn: fetchSessions });

export const useAdminReminders = (userId?: number) =>
  useQuery({
    queryKey: adminKeys.reminders(userId),
    queryFn: () => fetchReminders(userId),
  });

export const useAdminOverview = () =>
  useQuery({
    queryKey: adminKeys.overview,
    queryFn: fetchOverview,
    refetchInterval: 60_000,
  });

export const useAdminUsers = (f: UserFilters) =>
  useQuery({
    queryKey: adminKeys.users(f),
    queryFn: () => fetchUsers(f),
    placeholderData: keepPreviousData,
  });

export const useAdminUser = (id: number) =>
  useQuery({ queryKey: adminKeys.user(id), queryFn: () => fetchUser(id) });

/** An admin action: toasts the server's message and refreshes admin data. */
function useAdminAction<V>(fn: (v: V) => Promise<{ message: string }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: ({ message }) => toast.success(message),
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => qc.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export type UserCreate = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  notifyPermission: OnOff;
};
export type UserPatch = Partial<
  Omit<UserCreate, "password"> & { status: UserStatus; password: string }
>;

export const useCreateUser = () =>
  useAdminAction((v: UserCreate) => callMsg(api.admin.users.post(v)));
export const useUpdateUser = () =>
  useAdminAction(({ id, ...patch }: UserPatch & { id: number }) =>
    callMsg(api.admin.users({ id }).patch(patch)),
  );
export const useDeleteUser = () =>
  useAdminAction((id: number) => callMsg(api.admin.users({ id }).delete()));
export const useLogoutDevice = () =>
  useAdminAction(({ id, sessionId }: { id: number; sessionId: number }) =>
    callMsg(api.admin.users({ id }).sessions({ sessionId }).delete()),
  );
export const useLogoutEverywhere = () =>
  useAdminAction((id: number) =>
    callMsg(api.admin.users({ id })["logout-all"].post()),
  );
