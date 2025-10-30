// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const callbackError = params.get("error");

  let displayError = error;
  if (!error && callbackError === "NotVerified") displayError = "Please verify your email before logging in.";
  else if (!error && callbackError === "CredentialsSignin") displayError = "Invalid email or password.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", { email, password, redirect: false });

    if (res?.error) {
      setError("Invalid email or password, or email not verified.");
    } else if (res?.ok) {
      // fetch the session to check emailVerified flag (optional)
      router.push("/dashboard");
    }
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Welcome back</h1>

      {displayError && (
        <p className="mb-4 rounded-md bg-red-500/10 p-3 text-red-400">{displayError}</p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            type="email"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input
            type="password"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
        >
          Log in
        </button>
      </form>

      {/* ↓ Footer with links */}
      <div className="mt-6 space-y-2 text-sm text-neutral-400">
        <p>
          Forgot your password?{" "}
          <Link className="text-emerald-400 hover:underline" href="/forgot-password">
            Reset it
          </Link>
        </p>
        <p>
          New here?{" "}
          <Link className="text-emerald-400 hover:underline" href="/register">
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}
