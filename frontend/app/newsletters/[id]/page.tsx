import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate, formatDuration, formatInTimeZone } from "@/lib/format";
import StatTile from "@/components/StatTile";
import StatusBadge from "@/components/StatusBadge";
import CompleteNewsletterButton from "@/components/CompleteNewsletterButton";
import SlideEngagementChart, { type SlideEngagement } from "@/components/SlideEngagementChart";
import DistributeForm from "./DistributeForm";

type NewsletterDetail = {
  id: number;
  title: string;
  status: string;
  publishedAt: string | null;
  recipientCount: number;
  openRate: number;
  completionRate: number;
  scheduledAt: string | null;
  scheduledAllEmployees: boolean;
  scheduledGroupNames: string[];
};

type Settings = { companyName: string; timeZoneId: string };

type AnalyticsSummary = {
  totalOpened: number;
  averageReadTimeSeconds: number;
};

type RecipientAnalytics = {
  recipientId: number;
  employeeId: number;
  employeeName: string;
  email: string;
  opened: boolean;
  completed: boolean;
};

type Group = { id: number; name: string; employeeCount: number };

export default async function NewsletterDetailPage(props: PageProps<"/newsletters/[id]">) {
  const { id } = await props.params;

  let newsletter: NewsletterDetail;
  try {
    newsletter = await apiFetch<NewsletterDetail>(`/api/newsletters/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [summary, slides, recipients, groups, settings] = await Promise.all([
    apiFetch<AnalyticsSummary>(`/api/analytics/${id}`),
    apiFetch<SlideEngagement[]>(`/api/analytics/${id}/slides`),
    apiFetch<RecipientAnalytics[]>(`/api/analytics/${id}/recipients`),
    apiFetch<Group[]>("/api/groups"),
    apiFetch<Settings>("/api/settings"),
  ]);

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {newsletter.title}
        </h1>
        <Link href={`/analytics/${id}`} className="text-sm underline" style={{ color: "var(--text-primary)" }}>
          Full analytics →
        </Link>
      </div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <StatusBadge status={newsletter.status} />
        {newsletter.status === "Scheduled" && newsletter.scheduledAt && (
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Scheduled for {formatInTimeZone(newsletter.scheduledAt, settings.timeZoneId)}
          </span>
        )}
        {newsletter.status === "Sent" && newsletter.publishedAt && (
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Sent {formatDate(newsletter.publishedAt)}
          </span>
        )}
        {newsletter.status === "Sent" && <CompleteNewsletterButton newsletterId={newsletter.id} />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatTile label="Recipients" value={newsletter.recipientCount.toString()} />
        <StatTile label="Open rate" value={`${newsletter.openRate}%`} />
        <StatTile label="Completion rate" value={`${newsletter.completionRate}%`} />
        <StatTile label="Avg read time" value={formatDuration(summary.averageReadTimeSeconds)} />
      </div>

      <div className="mb-8">
        <DistributeForm
          newsletterId={newsletter.id}
          groups={groups}
          status={newsletter.status}
          scheduledAt={newsletter.scheduledAt}
          scheduledAllEmployees={newsletter.scheduledAllEmployees}
          scheduledGroupNames={newsletter.scheduledGroupNames}
          timeZoneId={settings.timeZoneId}
        />
      </div>

      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        Slide engagement
      </h2>
      <div className="mb-8">
        <SlideEngagementChart slides={slides} totalOpened={summary.totalOpened} />
      </div>

      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        Recipients
      </h2>
      {recipients.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No one has been sent this newsletter yet.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: "var(--gridline)" }}>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Employee</th>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Opened</th>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Completed</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.recipientId} className="border-b" style={{ borderColor: "var(--gridline)" }}>
                <td className="py-2 pr-4">
                  <Link href={`/employees/${r.employeeId}`} className="hover:underline" style={{ color: "var(--text-primary)" }}>
                    {r.employeeName}
                  </Link>
                </td>
                <td className="py-2 pr-4">{r.opened ? "✓" : "✕"}</td>
                <td className="py-2 pr-4">{r.completed ? "✓" : "✕"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
