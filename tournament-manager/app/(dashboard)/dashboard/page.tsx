// app/(dashboard)/dashboard/page.tsx
"use client";

import { signOut } from "next-auth/react";

export default function DashboardPage() {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl p-6">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Tournament Manager</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800"
          >
            Sign out
          </button>
        </header>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <p className="text-neutral-300">You’re logged in. Content coming in Phase 2.</p>
        </div>
      </div>
    </div>
  );
}
