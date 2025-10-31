import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { auth } from '@/lib/auth';

// Make the layout an async function to check session
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      {/* Simple Public Header */}
      <header className="border-b bg-background shadow-sm sticky top-0 z-50">
        <nav className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Tournament Manager
          </Link>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {/* Show "Dashboard" button if logged in, otherwise "Login" */}
            {session ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">Login</Link>
              </Button>
            )}
            
          </div>
        </nav>
      </header>

      {/* Page Content */}
      <main className="flex-1 py-8">
        <div className="container mx-auto max-w-7xl px-4">{children}</div>
      </main>

      {/* Use the reusable component */}
      <Footer />
    </div>
  );
}