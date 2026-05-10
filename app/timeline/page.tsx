import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { ReflectionTimeline } from "@/components/reflection-timeline";

export default function TimelinePage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <div className="space-y-5">
          <section className="rounded-3xl bg-sage p-5 text-white shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              Timeline
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your reflection history</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/74">
              Review your entries over time, spot growth patterns, and choose strong
              evidence for your portfolio.
            </p>
          </section>
          <ReflectionTimeline />
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
