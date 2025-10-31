'use client';

import { signOut } from 'next-auth/react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import React from 'react';

export default function SignOutButton() {
  return (
    <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
      Sign Out
    </DropdownMenuItem>
  );
}