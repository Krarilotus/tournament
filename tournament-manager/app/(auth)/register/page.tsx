// app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) setError(data.error || "Registration failed.");
    else setMessage(data.message);
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Create your account</h1>
      {error && <p className="mb-4 rounded-md bg-red-500/10 p-3 text-red-400">{error}</p>}
      {message && <p className="mb-4 rounded-md bg-emerald-500/10 p-3 text-emerald-400">{message}</p>}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm">Name</label>
          <input
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
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
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
        >
          Register
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-400">
        Already have an account?{" "}
        <Link className="text-emerald-400 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </>
  );
}
