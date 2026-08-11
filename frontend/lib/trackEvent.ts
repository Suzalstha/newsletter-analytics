export type TrackEventInput = {
  newsletterId: number;
  recipientId: number;
  eventType:
    | "NEWSLETTER_OPENED"
    | "SLIDE_VIEWED"
    | "SLIDE_EXITED"
    | "LINK_CLICKED"
    | "NEWSLETTER_COMPLETED";
  slideNumber?: number;
  durationSeconds?: number;
};

export async function trackEvent(input: TrackEventInput) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // Tracking is best-effort — a failed analytics call must never break the reading experience.
  }
}
