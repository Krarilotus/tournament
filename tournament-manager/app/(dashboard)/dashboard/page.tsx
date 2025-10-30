// app/(dashboard)/dashboard/page.tsx
"use client";

import SignOutButton from "@/components/auth/SignOutButton";

export default function DashboardPage() {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl p-6">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Tournament Manager</h1>
          <SignOutButton />
        </header>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <p className="text-neutral-300">You’re logged in. Content coming in Phase 2.</p>
        </div>
      </div>
    </div>
  );
}
