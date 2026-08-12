import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import EmptyState from "@/components/EmptyState";

type Newsletter = {
  id: number;
  title: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  recipientCount: number;
  openRate: number;
  completionRate: number;
};

async function getNewsletters(): Promise<Newsletter[]> {
  return apiFetch<Newsletter[]>("/api/newsletters");
}

export default async function NewslettersPage() {
  const newsletters = await getNewsletters();

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
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  {n.status}
                  {n.publishedAt ? ` · Published ${formatDate(n.publishedAt)}` : ` · Created ${formatDate(n.createdAt)}`}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
