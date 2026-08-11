import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import StatTile from "@/components/StatTile";
import EmptyState from "@/components/EmptyState";

type Newsletter = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  recipientCount: number;
  openRate: number;
  completionRate: number;
};

type DashboardOverview = {
  totalNewsletters: number;
  totalEmployees: number;
  totalRecipientsSent: number;
  averageOpenRate: number;
  averageCompletionRate: number;
  recentActivity: { type: string; description: string; timestamp: string }[];
};

async function getOverview(): Promise<DashboardOverview> {
  return apiFetch<DashboardOverview>("/api/dashboard/overview");
}

async function getNewsletters(): Promise<Newsletter[]> {
  return apiFetch<Newsletter[]>("/api/newsletters");
}

export default async function DashboardPage() {
  const [overview, newsletters] = await Promise.all([getOverview(), getNewsletters()]);
  const recentNewsletters = newsletters.slice(0, 5);

  return (
    <main className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <Link href="/newsletters/upload" className="px-4 py-2 bg-black text-white rounded text-sm">
          + Upload Newsletter
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        <StatTile label="Total newsletters" value={overview.totalNewsletters.toString()} />
        <StatTile label="Total employees" value={overview.totalEmployees.toString()} />
        <StatTile label="Newsletters sent" value={overview.totalRecipientsSent.toLocaleString()} />
        <StatTile label="Avg open rate" value={`${overview.averageOpenRate}%`} />
        <StatTile label="Avg completion rate" value={`${overview.averageCompletionRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Recent newsletters
          </h2>

          {recentNewsletters.length === 0 ? (
            <EmptyState
              title="No newsletters yet"
              description="Upload your first finished PDF to get started."
              action={
                <Link href="/newsletters/upload" className="text-sm underline" style={{ color: "var(--text-primary)" }}>
                  Upload a newsletter
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {recentNewsletters.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                  style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {n.title}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {n.status} · {n.recipientCount} recipients · {n.openRate}% opened · {n.completionRate}% completed
                    </p>
                  </div>
                  <Link href={`/analytics/${n.id}`} className="text-sm underline shrink-0 ml-4" style={{ color: "var(--text-primary)" }}>
                    View Analytics
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Recent activity
          </h2>

          {overview.recentActivity.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Nothing has happened yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {overview.recentActivity.map((item, i) => (
                <li key={i} className="text-sm">
                  <span style={{ color: "var(--text-primary)" }}>{item.description}</span>
                  <br />
                  <span style={{ color: "var(--text-muted)" }}>{formatRelativeTime(item.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
