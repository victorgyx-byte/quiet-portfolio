import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { ReflectionTimeline } from "@/components/reflection-timeline";

export default function TimelinePage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <div className="space-y-5">
          <ReflectionTimeline />
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
