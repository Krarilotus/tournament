import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

// You can remove the "use client" as this page is now static content.
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">My Tournaments</h1>
        <Button asChild>
          <Link href="/dashboard/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Tournament
          </Link>
        </Button>
      </div>

      {/* Empty State */}
      <div className="flex-1 rounded-lg border border-dashed border-muted-foreground/50 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <h3 className="text-lg font-medium text-muted-foreground">
          You don&apos;t have any tournaments yet.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by creating a new tournament.
        </p> 
        <Button asChild className="mt-4">
          <Link href="/dashboard/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create First Tournament
          </Link>
        </Button>
      </div>
    </div>
  );
}