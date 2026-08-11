import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import StatTile from "@/components/StatTile";

type EmployeeAnalytics = {
  employeeId: number;
  name: string;
  email: string;
  newslettersReceived: number;
  opened: number;
  openRate: number;
  completed: number;
  completionRate: number;
  averageReadTimeSeconds: number;
  recentNewsletters: {
    newsletterId: number;
    newsletterTitle: string;
    opened: boolean;
    completed: boolean;
    readTimeSeconds: number;
  }[];
};

export default async function EmployeeDetailPage(props: PageProps<"/employees/[id]">) {
  const { id } = await props.params;

  let analytics: EmployeeAnalytics;
  try {
    analytics = await apiFetch<EmployeeAnalytics>(`/api/employees/${id}/analytics`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {analytics.name}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {analytics.email}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatTile label="Newsletters received" value={analytics.newslettersReceived.toString()} />
        <StatTile label="Opened" value={`${analytics.opened} (${analytics.openRate}%)`} />
        <StatTile label="Completed" value={`${analytics.completed} (${analytics.completionRate}%)`} />
        <StatTile label="Average read time" value={formatDuration(analytics.averageReadTimeSeconds)} />
      </div>

      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        Recent newsletters
      </h2>

      {analytics.recentNewsletters.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          This employee hasn&rsquo;t received any newsletters yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {analytics.recentNewsletters.map((n) => (
            <div
              key={n.newsletterId}
              className="border rounded-lg p-4"
              style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
            >
              <Link href={`/newsletters/${n.newsletterId}`} className="font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
                {n.newsletterTitle}
              </Link>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Opened {n.opened ? "✓" : "✕"} · Completed {n.completed ? "✓" : "✕"} · Read time: {formatDuration(n.readTimeSeconds)}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
