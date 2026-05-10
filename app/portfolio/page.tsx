import { AppShell } from "@/components/app-shell";
import { PortfolioBuilder } from "@/components/portfolio-builder";
import { ProtectedRoute } from "@/components/protected-route";

export default function PortfolioPage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <div className="space-y-5">
          <section className="rounded-3xl bg-moss p-5 text-white shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              Portfolio
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Build your submission</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/74">
              Select reflections, write your growth statement, and export a clean
              portfolio PDF for submission.
            </p>
          </section>
          <PortfolioBuilder />
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
