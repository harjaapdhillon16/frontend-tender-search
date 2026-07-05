"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Tenders", icon: "📋" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-lg">
          🔎
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900">
          Tender Search
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-slate-700">
            {user.name || user.email}
          </p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar — fixed to viewport height, never grows with content */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[80%] border-r border-slate-200 bg-white shadow-xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="flex items-center gap-1.5 font-bold tracking-tight text-slate-900">
            🔎 Tender Search
          </span>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
