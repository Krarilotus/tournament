"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Import the new shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  // --- YOUR ORIGINAL LOGIC (Kept 100%) ---
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
  // --- END OF YOUR LOGIC ---

  return (
    <div className="grid place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        
        <h1 className="mb-6 text-2xl font-semibold text-center">Reset your password</h1>
        
        {err && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive-foreground text-sm border border-destructive/20">
            {err}
          </p>
        )}
        {msg && (
          <p className="mb-4 rounded-md bg-green-500/10 p-3 text-green-400 text-sm border border-green-500/20">
            {msg}
          </p>
        )}

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="pw1">New Password</Label>
            <Input
              id="pw1"
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Confirm New Password</Label>
            <Input
              id="pw2"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full">
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}