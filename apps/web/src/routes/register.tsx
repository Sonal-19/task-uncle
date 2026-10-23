import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/common/field";
import { Logo } from "@/components/common/logo";
import { PasswordInput } from "@/components/common/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/hooks/use-auth";
import { homeFor, useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/register")({
  component: Register,
});

/** Sign-up: name, email (unique), password → logged in on the dashboard. */
function Register() {
  const user = useAuthStore((s) => s.user);
  const register = useRegister();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const mismatch = !!confirmPw && confirmPw !== password;

  if (user) return <Navigate to={homeFor(user)} replace />;

  return (
    <div className="pt-safe pb-safe grid min-h-dvh place-items-center bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)] px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-3xl border bg-card p-5 shadow-xl shadow-black/5 sm:p-7">
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your pending work and Uncle will remind you until it's done.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (mismatch) return;
              register.mutate({
                name: name.trim(),
                email: email.trim(),
                password,
              });
            }}
          >
            <Field label="Name" htmlFor="rg-name" required>
              <div className="relative">
                <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="rg-name"
                  required
                  autoFocus
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Your name"
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Email" htmlFor="rg-email" required>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="rg-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>
            <Field
              label="Password"
              htmlFor="rg-pw"
              hint="At least 6 characters."
              required
            >
              <PasswordInput
                id="rg-pw"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm password" htmlFor="rg-pw2" required>
              <PasswordInput
                id="rg-pw2"
                required
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                aria-invalid={mismatch}
              />
              {mismatch && (
                <p className="text-xs text-destructive">
                  Passwords don't match.
                </p>
              )}
            </Field>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={register.isPending || mismatch}
            >
              {register.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Create account"
              )}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/"
              hash="login"
              className="font-medium text-primary hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
        <Link
          to="/"
          className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
