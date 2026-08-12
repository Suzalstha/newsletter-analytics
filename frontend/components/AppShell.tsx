"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on navigation -- adjusted during render (rather
  // than in an effect) by keying off the pathname change directly.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  // Newsletter viewer pages (/newsletter/[token]) are the employee-facing reading
  // experience -- no admin chrome around those.
  if (pathname.startsWith("/newsletter/")) {
    return <>{children}</>;
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="px-3 py-2 rounded-md text-sm transition-colors"
          style={{
            color: isActive(item.href) ? "var(--text-primary)" : "var(--text-secondary)",
            backgroundColor: isActive(item.href) ? "var(--accent-soft)" : "transparent",
            fontWeight: isActive(item.href) ? 600 : 400,
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--surface-page)" }}>
      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-card)" }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 -ml-2 rounded-md"
          style={{ color: "var(--text-primary)" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
          {companyName}
        </p>
        <ThemeToggle />
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        />
      )}

      {/* Sidebar: persistent on desktop/laptop, off-canvas drawer below lg */}
      <aside
        className={`w-64 shrink-0 border-r flex flex-col fixed lg:sticky top-0 h-screen z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-card)" }}
      >
        <div className="px-5 py-5 flex items-start justify-between">
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {companyName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Newsletter Analytics
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1 -mr-1 rounded"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {nav}

        <div className="mt-auto p-3">
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</div>
    </div>
  );
}
