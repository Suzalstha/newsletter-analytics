import Link from "next/link";
import { apiFetch } from "@/lib/api";
import EmptyState from "@/components/EmptyState";

type Newsletter = {
  id: number;
  title: string;
  status: string;
  recipientCount: number;
  openRate: number;
  completionRate: number;
};

async function getNewsletters(): Promise<Newsletter[]> {
  return apiFetch<Newsletter[]>("/api/newsletters");
}

export default async function AnalyticsIndexPage() {
  const newsletters = (await getNewsletters()).sort((a, b) => b.openRate - a.openRate);

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Analytics
      </h1>

      {newsletters.length === 0 ? (
        <EmptyState title="No analytics yet" description="Upload and distribute a newsletter to start seeing engagement data." />
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: "var(--gridline)" }}>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Newsletter</th>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Recipients</th>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Open rate</th>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Completion rate</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {newsletters.map((n) => (
              <tr key={n.id} className="border-b" style={{ borderColor: "var(--gridline)" }}>
                <td className="py-2 pr-4" style={{ color: "var(--text-primary)" }}>{n.title}</td>
                <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{n.recipientCount}</td>
                <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{n.openRate}%</td>
                <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{n.completionRate}%</td>
                <td className="py-2 pr-4">
                  <Link href={`/analytics/${n.id}`} className="underline" style={{ color: "var(--text-primary)" }}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
