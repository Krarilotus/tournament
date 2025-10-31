"use client";
import { useState } from "react";
import Link from "next/link";

// Import the new shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="grid place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        
        <h1 className="mb-6 text-2xl font-semibold text-center">Forgot your password?</h1>
        
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          Remembered it? <Link className="text-primary hover:underline font-medium" href="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}