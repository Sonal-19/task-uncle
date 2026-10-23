import { eq, inArray } from "drizzle-orm";
import webpush, { WebPushError } from "web-push";
import { db } from "$/db";
import { pushSubscriptionsTable } from "$/db/schema";
import { VAPID } from "$/env";
import type { PushPayload } from "$/lib/shared/reminder-engine";

const P = pushSubscriptionsTable;

/** A reminder older than this is dropped by the push service rather than
 * delivered late to a device that was offline (a fresh one follows). */
const TTL_SECONDS = 60 * 60;
/** Parallel sends per batch. */
const CONCURRENCY = 50;

/**
 * Web Push with VAPID (no Firebase): the browser's own push service (FCM in
 * Chrome, Mozilla's, Apple's) holds the message while the device is
 * offline and hands it to our service worker, which draws the notification
 * — the same data-only pattern as myasta's `push-sw.js`.
 */
class PushService {
  readonly enabled = !!(VAPID.publicKey && VAPID.privateKey);

  constructor() {
    if (this.enabled)
      webpush.setVapidDetails(VAPID.subject, VAPID.publicKey, VAPID.privateKey);
    else console.warn("[Push] VAPID keys missing: Web Push is off");
  }

  get publicKey() {
    return this.enabled ? VAPID.publicKey : null;
  }

  /** Sends to every browser of a user; dead subscriptions are deleted. */
  async sendToUser(userId: number, payloads: PushPayload[]) {
    if (!this.enabled || !payloads.length) return { sent: 0, devices: 0 };
    const subs = await db.select().from(P).where(eq(P.userId, userId));
    const dead: number[] = [];
    const ok: number[] = [];
    const jobs = subs.flatMap((s) => payloads.map((p) => ({ s, p })));
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      await Promise.all(
        jobs.slice(i, i + CONCURRENCY).map(async ({ s, p }) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
              },
              JSON.stringify(p),
              { TTL: TTL_SECONDS, urgency: "high", topic: topicOf(p.tag) },
            );
            ok.push(s.id);
          } catch (err) {
            if (
              err instanceof WebPushError &&
              (err.statusCode === 404 || err.statusCode === 410)
            )
              dead.push(s.id);
            else
              console.error(
                `[Push] send to subscription ${s.id} failed:`,
                err instanceof Error ? err.message : err,
              );
          }
        }),
      );
    }
    if (dead.length)
      await db.delete(P).where(inArray(P.id, [...new Set(dead)]));
    if (ok.length)
      await db
        .update(P)
        .set({ lastSuccessAt: new Date() })
        .where(inArray(P.id, [...new Set(ok)]));
    return { sent: ok.length, devices: subs.length - new Set(dead).size };
  }
}

/** Push "topic": a newer reminder for the same task replaces one still
 * waiting at the push service (max 32 URL-safe chars). */
const topicOf = (tag: string) =>
  tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || "reminder";

export const pushService = new PushService();
