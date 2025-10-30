"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const router = useRouter();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");

    if (pw1 !== pw2) {
      setErr("Passwords do not match.");
      return;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: pw1 }),
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "Something went wrong.");
    else {
      setMsg("Password updated. Redirecting to login…");
      setTimeout(() => router.push("/login"), 1200);
    }
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Reset your password</h1>
      {err && <p className="mb-4 rounded-md bg-red-500/10 p-3 text-red-400">{err}</p>}
      {msg && <p className="mb-4 rounded-md bg-emerald-500/10 p-3 text-emerald-400">{msg}</p>}

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="mb-1 block text-sm">New Password</label>
          <input
            type="password"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Confirm New Password</label>
          <input
            type="password"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <button className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500">
          Update password
        </button>
      </form>
    </>
  );
}
