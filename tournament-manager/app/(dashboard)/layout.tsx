import Link from "next/link";
import SignOutButton from "@/components/auth/SignOutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <Link href="/dashboard" className="font-semibold">Tournament Manager</Link>
        <nav className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm hover:bg-neutral-900">Dashboard</Link>
          <SignOutButton />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
