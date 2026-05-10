"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const links = [
  { href: "/dashboard", label: "Reflections" },
  { href: "/timeline", label: "Timeline" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/teacher", label: "Teacher" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, isTeacher } = useAuth();
  const showQuickAdd = pathname !== "/dashboard" && pathname !== "/teacher";

  function isActivePath(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-3 sm:px-6 sm:pb-6 lg:px-8">
      <header className="sticky top-0 z-20 -mx-4 border-b border-ink/10 bg-mist/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/" className="text-sm font-black uppercase tracking-[0.08em] text-ink">
            Student's Companion
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-ink/10 bg-white/70 p-1 sm:flex">
            {links.map(link => {
              if (link.href === "/teacher" && !isTeacher) return null;
              const isActive = isActivePath(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    isActive ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
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
              className="rounded-full border border-ink/15 bg-white/70 px-3 py-2 text-xs font-semibold text-ink/70 transition hover:text-ink sm:px-4"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </header>
      <div className="flex-1 py-4 sm:py-6">{children}</div>

      {showQuickAdd ? (
        <Link
          href="/dashboard#compose"
          className="fixed bottom-24 right-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-ink text-2xl font-bold text-white shadow-soft sm:hidden"
        >
          +
        </Link>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-ink/10 bg-mist/95 px-3 pb-4 pt-2 backdrop-blur sm:hidden">
        <div className="grid grid-cols-3 gap-2">
          {links
            .filter(link => (link.href === "/teacher" ? isTeacher : true))
            .filter(link => link.href !== "/teacher")
            .map(link => {
              const isActive = isActivePath(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                    isActive ? "bg-ink text-white" : "bg-white text-ink/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
        </div>
      </nav>
    </main>
  );
}
