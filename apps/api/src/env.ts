export const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://localhost/task_uncle";

/** Postgres connections kept by the API process. */
export const DB_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 10);

export const IS_PROD = process.env.NODE_ENV === "production";

/** 4500 in dev (Vite proxies `/api`), 4600 behind prod nginx. */
export const PORT = Number(process.env.PORT ?? (IS_PROD ? 4600 : 4500));

/** Rolling session length for opaque auth tokens (auths table + in-memory cache). */
export const SESSION_DAYS = Number(process.env.SESSION_DAYS ?? 30);

export const ALLOWED_ORIGIN_HOSTS = (
  process.env.ALLOWED_ORIGINS || "https://taskuncle.com"
).split(",");

export const SMTP = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT ?? 587),
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
};

/** OTP accepted for every flow outside production. */
export const DEV_OTP = "123456";

/** Web Push (VAPID). Without the keys, push is off and reminders only come
 * from an open app. Generate with `bunx web-push generate-vapid-keys`. */
export const VAPID = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
  subject: process.env.VAPID_SUBJECT || "mailto:admin@taskuncle.app",
};

/** Quiet hours and due times are wall-clock: until a user's browser reports
 * its timezone, this one is used. */
export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "Asia/Kolkata";
