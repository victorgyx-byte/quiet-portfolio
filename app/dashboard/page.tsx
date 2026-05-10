import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { StudentDashboard } from "@/components/student-dashboard";

export default function DashboardPage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <StudentDashboard />
      </ProtectedRoute>
    </AppShell>
  );
}
