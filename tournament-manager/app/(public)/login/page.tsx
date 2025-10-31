"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Import the new shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  // --- YOUR ORIGINAL LOGIC (Kept 100%) ---
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
      router.push("/dashboard");
    }
  };
  // --- END OF YOUR LOGIC ---

  return (
    // This wrapper provides the centering and card styling
    <div className="grid place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        
        <h1 className="mb-6 text-2xl font-semibold text-center">Welcome back</h1>

        {displayError && (
          // Use shadcn's destructive colors for the error
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive-foreground text-sm border border-destructive/20">
            {displayError}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-muted-foreground text-center">
          <p>
            Forgot your password?{" "}
            <Link className="text-primary hover:underline font-medium" href="/forgot-password">
              Reset it
            </Link>
          </p>
          <p>
            New here?{" "}
            <Link className="text-primary hover:underline font-medium" href="/register">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}