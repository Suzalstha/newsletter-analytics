import { notFound } from "next/navigation";
import NewsletterViewer, { type Recipient, type Slide } from "./NewsletterViewer";

async function getRecipient(token: string): Promise<Recipient | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recipients/${token}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Failed to resolve recipient");
  }

  return res.json();
}

async function getSlides(newsletterId: number): Promise<Slide[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/newsletters/${newsletterId}/slides`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch slides");
  }

  return res.json();
}

export default async function NewsletterPage(props: PageProps<"/newsletter/[token]">) {
  const { token } = await props.params;

  const recipient = await getRecipient(token);
  if (!recipient) {
    notFound();
  }

  const slides = await getSlides(recipient.newsletterId);

  return <NewsletterViewer recipient={recipient} slides={slides} />;
}
