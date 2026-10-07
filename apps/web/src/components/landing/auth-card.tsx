import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KeyRound, Loader2, LogIn, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { PasswordInput } from "@/components/common/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_PASSWORD, DEMO_USER, mockApi } from "@/lib/mock-api";
import { useAuthStore } from "@/stores/auth-store";

/** Shown while the API is dummy: the demo credentials, one tap to fill. */
export function DemoHint({
  label,
  value,
  onFill,
}: {
  label: string;
  value: string;
  onFill?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary dark:bg-primary/15">
      <span className="flex min-w-0 items-center gap-1.5 font-medium">
        <KeyRound className="size-3.5 shrink-0" />
        <span className="truncate">
          {label}: <b className="font-mono">{value}</b>
        </span>
      </span>
      {onFill && (
        <button
          type="button"
          onClick={onFill}
          className="shrink-0 rounded bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95"
        >
          Auto-fill
        </button>
      )}
    </div>
  );
}

export function AuthCard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => mockApi.login(email, password),
    onSuccess: (u) => {
      setUser(u);
      toast.success(`Welcome back, ${u.name}!`);
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error(e.message),
  });

  if (user) {
    return (
      <div className="rounded-3xl border bg-card p-6 shadow-2xl shadow-primary/10 sm:p-8">
        <p className="text-sm text-muted-foreground">Logged in as</p>
        <p className="text-lg font-semibold">{user.email}</p>
        <Button asChild size="lg" className="mt-5 w-full">
          <Link to="/dashboard">
            Open dashboard <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      id="login"
      className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-2xl shadow-primary/10 sm:p-8"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <LogIn className="size-6" />
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">Admin login</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Log in to see your pending work.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate();
        }}
      >
        <DemoHint
          label="Demo"
          value={`${DEMO_USER.email} / ${DEMO_PASSWORD}`}
          onFill={() => {
            setEmail(DEMO_USER.email);
            setPassword(DEMO_PASSWORD);
          }}
        />
        <Field label="Email" htmlFor="login-email">
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </Field>
        <Field label="Password" htmlFor="login-password">
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            search={{ email: email || undefined }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={login.isPending}
        >
          {login.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              Log in <ArrowRight />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
