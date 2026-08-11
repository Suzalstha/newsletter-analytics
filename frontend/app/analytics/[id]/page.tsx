import { notFound } from "next/navigation";
import StatTile from "@/components/StatTile";
import SlideEngagementChart, { type SlideEngagement } from "@/components/SlideEngagementChart";
import { formatDuration } from "@/lib/format";

type NewsletterDto = {
  id: number;
  title: string;
};

type AnalyticsSummary = {
  newsletterId: number;
  totalSent: number;
  totalOpened: number;
  openRate: number;
  totalCompleted: number;
  completionRate: number;
  averageReadTimeSeconds: number;
  averageSlidesViewed: number;
};

async function getNewsletter(id: string): Promise<NewsletterDto | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/newsletters/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch newsletter");
  return res.json();
}

async function getSummary(id: string): Promise<AnalyticsSummary> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch analytics summary");
  return res.json();
}

async function getSlideEngagement(id: string): Promise<SlideEngagement[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/${id}/slides`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch slide engagement");
  return res.json();
}

export default async function AnalyticsPage(props: PageProps<"/analytics/[id]">) {
  const { id } = await props.params;

  const newsletter = await getNewsletter(id);
  if (!newsletter) {
    notFound();
  }

  const [summary, slides] = await Promise.all([getSummary(id), getSlideEngagement(id)]);

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        Newsletter Analytics
      </h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        {newsletter.title}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <StatTile label="Total sent" value={summary.totalSent.toLocaleString()} />
        <StatTile label="Opened" value={summary.totalOpened.toLocaleString()} />
        <StatTile label="Open rate" value={`${summary.openRate}%`} />
        <StatTile label="Completed" value={summary.totalCompleted.toLocaleString()} />
        <StatTile label="Completion rate" value={`${summary.completionRate}%`} />
        <StatTile label="Avg read time" value={formatDuration(summary.averageReadTimeSeconds)} />
        <StatTile label="Avg slides viewed" value={summary.averageSlidesViewed.toString()} />
      </div>

      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Slide engagement
      </h2>
      <SlideEngagementChart slides={slides} totalOpened={summary.totalOpened} />
    </main>
  );
}
