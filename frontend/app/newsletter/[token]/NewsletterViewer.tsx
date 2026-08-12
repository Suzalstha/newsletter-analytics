"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/trackEvent";

export type Recipient = {
  recipientId: number;
  newsletterId: number;
  newsletterTitle: string;
  employeeName: string;
};

export type Slide = {
  id: number;
  slideNumber: number;
  title: string;
  content: string;
  imageUrl: string | null;
};

export default function NewsletterViewer({
  recipient,
  slides,
}: {
  recipient: Recipient;
  slides: Slide[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const slideEnteredAt = useRef<number>(Date.now());
  const hasTrackedOpen = useRef(false);

  // Track NEWSLETTER_OPENED exactly once, on first render.
  useEffect(() => {
    if (hasTrackedOpen.current) return;
    hasTrackedOpen.current = true;
    trackEvent({
      newsletterId: recipient.newsletterId,
      recipientId: recipient.recipientId,
      eventType: "NEWSLETTER_OPENED",
    });
  }, [recipient]);

  if (slides.length === 0) {
    return (
      <main className="max-w-2xl mx-auto p-8" style={{ color: "var(--text-primary)" }}>
        This newsletter has no slides yet.
      </main>
    );
  }

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;

  function trackCurrentSlideDuration() {
    const durationSeconds = Math.round((Date.now() - slideEnteredAt.current) / 1000);
    trackEvent({
      newsletterId: recipient.newsletterId,
      recipientId: recipient.recipientId,
      eventType: "SLIDE_VIEWED",
      slideNumber: currentSlide.slideNumber,
      durationSeconds,
    });
  }

  function goToSlide(index: number) {
    trackCurrentSlideDuration();
    slideEnteredAt.current = Date.now();
    setCurrentIndex(index);
  }

  function handleNext() {
    if (!isLastSlide) goToSlide(currentIndex + 1);
  }

  function handlePrevious() {
    if (currentIndex > 0) goToSlide(currentIndex - 1);
  }

  function handleFinish() {
    trackCurrentSlideDuration();
    trackEvent({
      newsletterId: recipient.newsletterId,
      recipientId: recipient.recipientId,
      eventType: "NEWSLETTER_COMPLETED",
    });
    setCompleted(true);
  }

  if (completed) {
    return (
      <main className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Thank you, {recipient.employeeName.split(" ")[0]}!
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>You have completed the newsletter.</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{recipient.newsletterTitle}</p>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Slide {currentIndex + 1} / {slides.length}
      </p>

      {currentSlide.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${process.env.NEXT_PUBLIC_API_URL}${currentSlide.imageUrl}`}
          alt={currentSlide.title}
          className="w-full h-auto rounded-lg mb-8 border"
          style={{ borderColor: "var(--gridline)" }}
        />
      ) : (
        <>
          <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            {currentSlide.title}
          </h2>
          <p className="mb-8 whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
            {currentSlide.content}
          </p>
        </>
      )}

      <div className="flex justify-between">
        <button onClick={handlePrevious} disabled={currentIndex === 0} className="btn-secondary disabled:opacity-30">
          Previous
        </button>

        {isLastSlide ? (
          <button onClick={handleFinish} className="btn-primary">
            Finish
          </button>
        ) : (
          <button onClick={handleNext} className="btn-primary">
            Next
          </button>
        )}
      </div>
    </main>
  );
}
