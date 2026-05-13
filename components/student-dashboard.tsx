"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ReflectionForm } from "@/components/reflection-form";
import { useUiMode } from "@/components/ui-mode";
import { subscribeToRecentStudentNotifications } from "@/lib/notifications";
import type { StudentNotification } from "@/types/notification";

export function StudentDashboard() {
  const { user } = useAuth();
  const { mode } = useUiMode();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);

  useEffect(() => {
    return subscribeToRecentStudentNotifications(setNotifications, () => undefined);
  }, []);

  return (
    <div className="space-y-4">
      {notifications.length > 0 ? (
        <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Teacher notes
          </p>
          <div className="mt-3 space-y-2">
            {notifications.slice(0, 2).map(notification => (
              <article
                key={notification.id}
                className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3"
              >
                <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {notification.senderName}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {mode === "classic" ? (
        <section className="student-hero glass-card rounded-3xl p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
            Your Space
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
            Hey {firstName}, what stuck with you today?
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
            Snap a quick thought, add context later, and build your story over time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-semibold text-[#395cc7]">
              Private by default
            </span>
            <span className="rounded-full bg-[#ecfff9] px-3 py-1 text-xs font-semibold text-[#177f68]">
              Feedback when ready
            </span>
          </div>
        </section>
      ) : null}
      <div id="compose" className="compose-anchor scroll-mt-40 sm:scroll-mt-32">
        <ReflectionForm />
      </div>
    </div>
  );
}
