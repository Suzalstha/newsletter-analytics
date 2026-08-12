import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import StatTile from "@/components/StatTile";
import type { StatDelta } from "@/components/StatTile";
import EmptyState from "@/components/EmptyState";
import DashboardFilters from "@/components/DashboardFilters";
import { RANGE_OPTIONS } from "@/lib/dateRange";
import TrendChart, { type TrendPoint } from "@/components/TrendChart";
import SlideEngagementChart, { type SlideEngagement } from "@/components/SlideEngagementChart";
import GroupPerformance, { type GroupPerformanceRow } from "@/components/GroupPerformance";
import ActivityFeed from "@/components/ActivityFeed";
import Greeting from "@/components/Greeting";

type Newsletter = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
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

type RecipientAnalytics = {
  recipientId: number;
  employeeId: number;
  opened: boolean;
  completed: boolean;
};

type Employee = { id: number; groups: string[] };
type Group = { id: number; name: string; employeeCount: number };

const RECENT_WINDOW = 12;
const DAY_MS = 86_400_000;

async function getOverview(): Promise<DashboardOverview> {
  return apiFetch<DashboardOverview>("/api/dashboard/overview");
}
async function getNewsletters(): Promise<Newsletter[]> {
  return apiFetch<Newsletter[]>("/api/newsletters");
}
async function getEmployees(): Promise<Employee[]> {
  return apiFetch<Employee[]>("/api/employees");
}
async function getGroups(): Promise<Group[]> {
  return apiFetch<Group[]>("/api/groups");
}

function newsletterDate(n: Newsletter): Date {
  return new Date(n.publishedAt ?? n.createdAt);
}

function rangeBounds(range: string, from: string | undefined, to: string | undefined) {
  const now = new Date();
  let start: Date;
  let end = now;

  if (range === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (range === "7d") {
    start = new Date(now.getTime() - 7 * DAY_MS);
  } else if (range === "90d") {
    start = new Date(now.getTime() - 90 * DAY_MS);
  } else if (range === "custom" && from) {
    start = new Date(`${from}T00:00:00`);
    end = to ? new Date(`${to}T23:59:59`) : now;
  } else {
    start = new Date(now.getTime() - 30 * DAY_MS);
  }

  const durationMs = Math.max(end.getTime() - start.getTime(), DAY_MS);
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - durationMs);

  return { start, end, prevStart, prevEnd };
}

function inRange(n: Newsletter, start: Date, end: Date) {
  const d = newsletterDate(n);
  return d >= start && d <= end;
}

function sumRecipients(list: Newsletter[]) {
  return list.reduce((sum, n) => sum + n.recipientCount, 0);
}
function sumOpened(list: Newsletter[]) {
  return list.reduce((sum, n) => sum + Math.round((n.recipientCount * n.openRate) / 100), 0);
}
function sumCompleted(list: Newsletter[]) {
  return list.reduce((sum, n) => sum + Math.round((n.recipientCount * n.completionRate) / 100), 0);
}

function pctDelta(current: number, previous: number): StatDelta | undefined {
  if (previous <= 0) return undefined;
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { value: "flat vs. prior period", direction: "flat" };
  return {
    value: `${Math.abs(change).toFixed(1)}% vs. prior period`,
    direction: change > 0 ? "up" : "down",
  };
}

export default async function DashboardPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const range = (typeof searchParams.range === "string" ? searchParams.range : "30d") || "30d";
  const newsletterFilter = typeof searchParams.newsletter === "string" ? searchParams.newsletter : "";
  const groupFilter = typeof searchParams.group === "string" ? searchParams.group : "";
  const from = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const to = typeof searchParams.to === "string" ? searchParams.to : undefined;

  const [overview, allNewsletters, employees, groups] = await Promise.all([
    getOverview(),
    getNewsletters(),
    getEmployees(),
    getGroups(),
  ]);

  const { start, end, prevStart, prevEnd } = rangeBounds(range, from, to);

  const newsletterScoped = newsletterFilter
    ? allNewsletters.filter((n) => String(n.id) === newsletterFilter)
    : allNewsletters;

  const periodNewsletters = newsletterScoped.filter((n) => inRange(n, start, end));
  const prevPeriodNewsletters = newsletterScoped.filter((n) => inRange(n, prevStart, prevEnd));

  const totalSent = sumRecipients(periodNewsletters);
  const totalOpened = sumOpened(periodNewsletters);
  const totalCompleted = sumCompleted(periodNewsletters);
  const openRate = totalSent === 0 ? 0 : Math.round((totalOpened / totalSent) * 1000) / 10;
  const completionRate = totalSent === 0 ? 0 : Math.round((totalCompleted / totalSent) * 1000) / 10;

  const prevTotalSent = sumRecipients(prevPeriodNewsletters);
  const prevTotalOpened = sumOpened(prevPeriodNewsletters);
  const prevOpenRate = prevTotalSent === 0 ? 0 : (prevTotalOpened / prevTotalSent) * 100;
  const prevTotalCompleted = sumCompleted(prevPeriodNewsletters);
  const prevCompletionRate = prevTotalSent === 0 ? 0 : (prevTotalCompleted / prevTotalSent) * 100;

  // Bounded recent window: fetch per-newsletter summary + recipients only for
  // the most recent newsletters in scope, so this stays fast regardless of
  // total newsletter history. Powers reading time, group performance, and the
  // default "slide engagement" newsletter below.
  const boundedNewsletters = [...periodNewsletters]
    .sort((a, b) => newsletterDate(b).getTime() - newsletterDate(a).getTime())
    .slice(0, RECENT_WINDOW);

  const boundedDetails = await Promise.all(
    boundedNewsletters.map(async (n) => {
      const [summary, recipients] = await Promise.all([
        apiFetch<AnalyticsSummary>(`/api/analytics/${n.id}`),
        apiFetch<RecipientAnalytics[]>(`/api/analytics/${n.id}/recipients`),
      ]);
      return { newsletter: n, summary, recipients };
    })
  );

  const readTimes = boundedDetails.map((d) => d.summary.averageReadTimeSeconds).filter((v) => v > 0);
  const avgReadTimeSeconds = readTimes.length === 0 ? 0 : readTimes.reduce((a, b) => a + b, 0) / readTimes.length;

  // Group performance: join recipient rows -> employee -> group names, real
  // aggregation over the bounded window above, no fabricated numbers.
  const employeeGroups = new Map<number, string[]>(employees.map((e) => [e.id, e.groups]));
  const groupTotals = new Map<string, { sent: number; opened: number }>();
  for (const detail of boundedDetails) {
    for (const r of detail.recipients) {
      const memberGroups = employeeGroups.get(r.employeeId) ?? [];
      for (const groupName of memberGroups) {
        const totals = groupTotals.get(groupName) ?? { sent: 0, opened: 0 };
        totals.sent += 1;
        if (r.opened) totals.opened += 1;
        groupTotals.set(groupName, totals);
      }
    }
  }
  const groupPerformance: GroupPerformanceRow[] = groups
    .map((g) => {
      const totals = groupTotals.get(g.name);
      if (!totals || totals.sent === 0) return null;
      return {
        id: g.id,
        name: g.name,
        recipientCount: totals.sent,
        openRate: Math.round((totals.opened / totals.sent) * 1000) / 10,
      };
    })
    .filter((row): row is GroupPerformanceRow => row !== null)
    .filter((row) => !groupFilter || String(row.id) === groupFilter);

  // Trend: open/completion rate come free from the newsletters we already
  // fetched; reading time is only available for the bounded window.
  const readTimeByNewsletter = new Map(boundedDetails.map((d) => [d.newsletter.id, d.summary.averageReadTimeSeconds]));
  const trendData: TrendPoint[] = [...periodNewsletters]
    .sort((a, b) => newsletterDate(a).getTime() - newsletterDate(b).getTime())
    .map((n) => ({
      id: n.id,
      title: n.title,
      date: newsletterDate(n).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      openRate: n.openRate,
      completionRate: n.completionRate,
      avgReadTimeSeconds: readTimeByNewsletter.get(n.id) ?? null,
    }));

  // Slide engagement spotlight: the selected newsletter, or the most recent
  // one in scope.
  const spotlight = boundedNewsletters[0];
  const spotlightSlides = spotlight ? await apiFetch<SlideEngagement[]>(`/api/analytics/${spotlight.id}/slides`) : [];
  const spotlightSummary = spotlight ? boundedDetails.find((d) => d.newsletter.id === spotlight.id)?.summary : undefined;

  const recentNewsletters = [...periodNewsletters]
    .sort((a, b) => newsletterDate(b).getTime() - newsletterDate(a).getTime())
    .slice(0, 5);

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label ?? "Last 30 days";

  return (
    <main className="max-w-6xl mx-auto p-6 sm:p-8">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              <Greeting /> — here&rsquo;s how your newsletters are performing.
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {rangeLabel}
            </p>
          </div>
          <Link
            href="/newsletters/upload"
            className="px-4 py-2 rounded-md text-sm font-medium shrink-0"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)" }}
          >
            + Upload Newsletter
          </Link>
        </div>

        <DashboardFilters
          newsletters={allNewsletters.map((n) => ({ id: n.id, title: n.title }))}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        />
      </div>

      {allNewsletters.length === 0 ? (
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
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatTile label="Total Sent" value={totalSent.toLocaleString()} delta={pctDelta(totalSent, prevTotalSent)} />
            <StatTile
              label="Opened"
              value={`${totalOpened.toLocaleString()} (${openRate}%)`}
              delta={pctDelta(openRate, prevOpenRate)}
            />
            <StatTile
              label="Completion Rate"
              value={`${completionRate}%`}
              delta={pctDelta(completionRate, prevCompletionRate)}
            />
            <StatTile
              label="Avg. Read Time"
              value={avgReadTimeSeconds > 0 ? formatDuration(avgReadTimeSeconds) : "—"}
              hint="Per newsletter, recent window"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <section
              className="lg:col-span-2 rounded-xl border p-5"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}
            >
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Newsletter Engagement
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Is engagement improving? Track open rate, completion rate, and reading time across recent newsletters.
              </p>
              <TrendChart data={trendData} />
            </section>

            <section
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}
            >
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Group Performance
              </h2>
              <GroupPerformance groups={groupPerformance} />
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">
            <section
              className="lg:col-span-2 rounded-xl border p-5"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}
            >
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Recent newsletters
              </h2>

              {recentNewsletters.length === 0 ? (
                <EmptyState title="No newsletters in this period" description="Try a wider date range." />
              ) : (
                <div className="flex flex-col gap-2 mt-3">
                  {recentNewsletters.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between rounded-lg p-4 gap-4"
                      style={{ backgroundColor: "var(--surface-page)", border: "1px solid var(--border-default)" }}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {n.title}
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {newsletterDate(n).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                          {n.recipientCount} recipients
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          Open rate <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{n.openRate}%</span> · Completion{" "}
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{n.completionRate}%</span>
                        </p>
                      </div>
                      <Link
                        href={`/analytics/${n.id}`}
                        className="text-sm px-3 py-1.5 rounded-md border shrink-0"
                        style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                      >
                        View Analytics
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}
            >
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Recent activity
              </h2>
              <ActivityFeed items={overview.recentActivity} />
            </div>
          </div>

          {spotlight && spotlightSummary && (
            <section
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}
            >
              <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Slide engagement — {spotlight.title}
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                What content did people engage with? Reach per slide, out of {spotlightSummary.totalOpened} openers.
              </p>
              <SlideEngagementChart slides={spotlightSlides} totalOpened={spotlightSummary.totalOpened} />
            </section>
          )}
        </>
      )}
    </main>
  );
}
