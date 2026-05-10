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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-10 -mx-4 border-b border-ink/10 bg-mist/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/" className="text-base font-bold tracking-normal text-ink">
            Quiet Portfolio
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-ink/10 bg-white/70 p-1">
            {links.map(link => {
              if (link.href === "/teacher" && !isTeacher) return null;
              const isActive = pathname === link.href;
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
              className="rounded-full border border-ink/15 bg-white/70 px-3 py-2 text-xs font-semibold text-ink/70 transition hover:text-ink"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </header>
      <div className="flex-1 py-6">{children}</div>
    </main>
  );
}
