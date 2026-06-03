"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { StudentDashboard } from "@/components/student-dashboard";
import { useAuth } from "@/components/auth-provider";

function DashboardContent() {
  const { isTeacher, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isTeacher) {
      router.replace("/teacher");
    }
  }, [isTeacher, loading, router]);

  if (loading || isTeacher) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-blue-200/60" />
      </div>
    );
  }

  return <StudentDashboard />;
}

export default function DashboardPage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <DashboardContent />
      </ProtectedRoute>
    </AppShell>
  );
}
