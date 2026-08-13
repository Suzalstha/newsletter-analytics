import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import ScheduledNewsletterCard from "@/components/ScheduledNewsletterCard";

type Newsletter = {
  id: number;
  title: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  recipientCount: number;
  openRate: number;
  completionRate: number;
  scheduledAt: string | null;
  scheduledAllEmployees: boolean;
  scheduledGroupNames: string[];
};

type Settings = { companyName: string; timeZoneId: string };

async function getNewsletters(): Promise<Newsletter[]> {
  return apiFetch<Newsletter[]>("/api/newsletters");
}

async function getSettings(): Promise<Settings> {
  return apiFetch<Settings>("/api/settings");
}

export default async function NewslettersPage() {
  const [newsletters, settings] = await Promise.all([getNewsletters(), getSettings()]);
  const scheduled = newsletters.filter((n) => n.status === "Scheduled" && n.scheduledAt);

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Newsletters
        </h1>
        <Link href="/newsletters/upload" className="btn-primary">
          + Upload Newsletter
        </Link>
      </div>

      {scheduled.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Scheduled Newsletters
          </h2>
          <div className="flex flex-col gap-3">
            {scheduled.map((n) => (
              <ScheduledNewsletterCard
                key={n.id}
                newsletter={{
                  id: n.id,
                  title: n.title,
                  status: n.status,
                  scheduledAt: n.scheduledAt!,
                  scheduledAllEmployees: n.scheduledAllEmployees,
                  scheduledGroupNames: n.scheduledGroupNames,
                }}
                timeZoneId={settings.timeZoneId}
              />
            ))}
          </div>
        </div>
      )}

      {newsletters.length === 0 ? (
        <EmptyState
          title="No newsletters yet"
          description="Upload your first finished PDF to get started."
          action={
            <Link href="/newsletters/upload" className="text-sm underline" style={{ color: "var(--accent)" }}>
              Upload a newsletter
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {newsletters.map((n) => (
            <div
              key={n.id}
              className="border rounded-lg p-5 flex items-center justify-between"
              style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
            >
              <div>
                <Link href={`/newsletters/${n.id}`} className="font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
                  {n.title}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={n.status} />
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {n.publishedAt ? `Sent ${formatDate(n.publishedAt)}` : `Created ${formatDate(n.createdAt)}`}
                  </p>
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  {n.recipientCount} recipients · {n.openRate}% opened · {n.completionRate}% completed
                </p>
              </div>
              <Link href={`/analytics/${n.id}`} className="px-3 py-2 border rounded text-sm shrink-0" style={{ borderColor: "var(--gridline)" }}>
                View Analytics
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
