"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
    >
      Sign out
    </button>
  );
}
