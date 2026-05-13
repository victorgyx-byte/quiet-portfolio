"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { UiModeContext, type UiMode } from "@/components/ui-mode";

const links = [
  { href: "/dashboard", label: "Reflections" },
  { href: "/timeline", label: "Timeline" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/teacher", label: "Teacher" }
];

function NavIcon({ href, active }: { href: string; active: boolean }) {
  const stroke = active ? "#ffffff" : "#4d5f65";
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  if (href === "/dashboard") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path {...common} d="M3 12l9-8 9 8" />
        <path {...common} d="M6 10v10h12V10" />
      </svg>
    );
  }
  if (href === "/timeline") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path {...common} d="M5 7h14M5 12h9M5 17h12" />
        <circle cx="18.5" cy="12" r="1.2" fill={stroke} />
      </svg>
    );
  }
  if (href === "/portfolio") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <rect {...common} x="4" y="3.5" width="16" height="17" rx="2.4" />
        <path {...common} d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle {...common} cx="12" cy="8" r="3.2" />
      <path {...common} d="M5 20c1.6-3 4.1-4.5 7-4.5s5.4 1.5 7 4.5" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, isTeacher } = useAuth();
  const [mode, setMode] = useState<UiMode>("classic");
  const showQuickAdd =
    pathname !== "/dashboard" && pathname !== "/teacher" && pathname !== "/portfolio";
  const mobileLinks = links.filter(link => (link.href === "/teacher" ? isTeacher : true));

  useEffect(() => {
    const stored = localStorage.getItem("sc_ui_mode");
    const nextMode = stored === "studio" ? "studio" : "classic";
    setMode(nextMode);
    localStorage.removeItem("sc_theme");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.setAttribute("data-ui-mode", nextMode);
  }, []);

  function handleModeChange(nextMode: UiMode) {
    setMode(nextMode);
    localStorage.setItem("sc_ui_mode", nextMode);
    localStorage.removeItem("sc_theme");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.setAttribute("data-ui-mode", nextMode);
  }

  function isActivePath(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <UiModeContext.Provider value={{ mode, setMode: handleModeChange }}>
      <main className="app-frame mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-3 sm:px-6 sm:pb-6 lg:px-8">
        <header className="app-header sticky top-0 z-20 -mx-4 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <Link href="/" className="app-brand text-sm font-black uppercase tracking-[0.08em] text-slate-800">
              Student's Companion
            </Link>
            <div className="ui-mode-switch hidden items-center rounded-full border border-slate-200 bg-white p-1 sm:flex">
              {([
                ["classic", "Classic"],
                ["studio", "Studio"]
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleModeChange(id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    mode === id ? "bg-slate-900 text-white" : "text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <nav className="desktop-nav hidden items-center gap-1 rounded-full border border-slate-200 bg-white p-1 sm:flex">
              {links.map(link => {
                if (link.href === "/teacher" && !isTeacher) return null;
                const isActive = isActivePath(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            {user ? (
              <button
                onClick={signOut}
                className="sign-out-button rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800 sm:px-4"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </header>
        <div className="app-content flex-1 py-4 sm:py-6">{children}</div>

        {showQuickAdd ? (
          <Link
            href="/dashboard#compose"
            className="quick-add fixed bottom-24 right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)] sm:hidden"
          >
            +
          </Link>
        ) : null}

        <div className="mobile-mode-switch fixed bottom-[5.2rem] left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur sm:hidden">
          <div className="flex items-center">
            {([
              ["classic", "Classic"],
              ["studio", "Studio"]
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleModeChange(id)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  mode === id ? "bg-slate-900 text-white" : "text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-4 pt-2 backdrop-blur sm:hidden">
          <div className={`grid gap-2 ${mobileLinks.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            {mobileLinks.map(link => {
              const isActive = isActivePath(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`mobile-nav-item flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-center text-[11px] font-semibold ${
                    isActive ? "active bg-slate-900 text-white" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <NavIcon href={link.href} active={isActive} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </UiModeContext.Provider>
  );
}
