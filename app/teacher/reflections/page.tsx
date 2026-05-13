import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { TeacherDashboard } from "@/components/teacher-dashboard";

export default function TeacherReflectionsPage() {
  return (
    <AppShell>
      <ProtectedRoute teacherOnly>
        <TeacherDashboard activeTab="shared" />
      </ProtectedRoute>
    </AppShell>
  );
}
