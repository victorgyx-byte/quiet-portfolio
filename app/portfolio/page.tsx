import { AppShell } from "@/components/app-shell";
import { PortfolioBuilder } from "@/components/portfolio-builder";
import { ProtectedRoute } from "@/components/protected-route";

export default function PortfolioPage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <div className="space-y-5">
          <PortfolioBuilder />
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
