import Link from 'next/link';
import React from 'react';

export function Footer() {
  return (
    <footer className="border-t bg-muted">
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-muted-foreground sm:flex-row">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Tournament Manager. All rights reserved.
        </p>
        <div className="flex gap-4">
          <Link href="/impressum" className="text-sm hover:underline">
            Impressum / Legal
          </Link>
          <Link href="/privacy" className="text-sm hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}