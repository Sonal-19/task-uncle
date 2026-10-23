import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Logo } from "@/components/common/logo";
import { OtpInput } from "@/components/common/otp-input";
import { PasswordInput } from "@/components/common/password-input";
import { DEMO, DemoHint } from "@/components/landing/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, callMsg } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (s: Record<string, unknown>): { email?: string } => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  component: ForgotPassword,
});

/** Seconds left before "Resend" is allowed again. */
function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

function ForgotPassword() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState(search.email ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [cooldown, setCooldown] = useCountdown();

  const send = useMutation({
    mutationFn: () => callMsg(api.auth.password.forgot.post({ email })),
    onSuccess: ({ message }) => {
      toast.success(message);
      setStep("reset");
      setCooldown(60);
    },
    onError: (e) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: () =>
      callMsg(api.auth.password.reset.post({ email, otp, password })),
    onSuccess: ({ message }) => {
      toast.success(message);
      navigate({ to: "/", hash: "login", replace: true });
    },
    onError: (e) => toast.error(e.message),
  });

  const mismatch = !!confirmPw && confirmPw !== password;

  return (
    <div className="pt-safe pb-safe grid min-h-dvh place-items-center bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)] px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-3xl border bg-card p-5 shadow-xl shadow-black/5 sm:p-7">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <KeyRound className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {step === "email" ? "Forgot password?" : "Set a new password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "email"
              ? "Enter your email and we'll send a 6-digit code."
              : `Enter the code sent to ${email}.`}
          </p>

          {step === "email" ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                send.mutate();
              }}
            >
              <Field label="Email" htmlFor="fp-email">
                <Input
                  id="fp-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={send.isPending}
              >
                {send.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Send code"
                )}
              </Button>
            </form>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!mismatch) reset.mutate();
              }}
            >
              {DEMO.show && (
                <DemoHint
                  label="Demo code"
                  value={DEMO.otp}
                  onFill={() => setOtp(DEMO.otp)}
                />
              )}
              <OtpInput value={otp} onChange={setOtp} autoFocus />
              <Field label="New password" htmlFor="fp-pw">
                <PasswordInput
                  id="fp-pw"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Confirm password" htmlFor="fp-pw2">
                <PasswordInput
                  id="fp-pw2"
                  required
                  autoComplete="new-password"
                  aria-invalid={mismatch}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
                {mismatch && (
                  <p className="text-xs text-destructive">
                    Passwords don't match
                  </p>
                )}
              </Field>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={reset.isPending || otp.length !== 6 || mismatch}
              >
                {reset.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Update password"
                )}
              </Button>
              <button
                type="button"
                disabled={cooldown > 0 || send.isPending}
                onClick={() => send.mutate()}
                className="w-full text-center text-sm font-medium text-primary disabled:text-muted-foreground"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </form>
          )}
        </div>
        <Link
          to="/"
          className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to login
        </Link>
      </div>
    </div>
  );
}
