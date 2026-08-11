"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/newsletters", label: "Newsletters" },
  { href: "/employees", label: "Employees" },
  { href: "/groups", label: "Groups" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({
  companyName,
  children,
}: {
  companyName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Newsletter viewer pages (/newsletter/[token]) are the employee-facing reading
  // experience -- no admin chrome around those.
  if (pathname.startsWith("/newsletter/")) {
    return <>{children}</>;
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="w-56 shrink-0 border-r flex flex-col"
        style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
      >
        <div className="px-5 py-5">
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            {companyName}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Newsletter Analytics
          </p>
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded text-sm"
              style={{
                color: isActive(item.href) ? "var(--text-primary)" : "var(--text-secondary)",
                backgroundColor: isActive(item.href) ? "var(--gridline)" : "transparent",
                fontWeight: isActive(item.href) ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
