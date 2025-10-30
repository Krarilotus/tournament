"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Something went wrong.");
    else setMsg(data.message);
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Forgot your password?</h1>
      {err && <p className="mb-4 rounded-md bg-red-500/10 p-3 text-red-400">{err}</p>}
      {msg && <p className="mb-4 rounded-md bg-emerald-500/10 p-3 text-emerald-400">{msg}</p>}

      <form className="space-y-4" onSubmit={submit}>
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
        <button className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500">
          Send reset link
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-400">
        Remembered it? <Link className="text-emerald-400 hover:underline" href="/login">Back to login</Link>
      </p>
    </>
  );
}
