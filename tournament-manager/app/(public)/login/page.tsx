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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState(""); // For resend success
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false); // For resend button
  const [showResend, setShowResend] = useState(false);

  const router = useRouter();
  const params = useSearchParams();

  const callbackError = params.get("error");
  const verified = params.get("verified");

  let displayError = error;
  if (!error && callbackError === "NotVerified") {
    displayError = "Please verify your email before logging in.";
    if (!showResend) setShowResend(true);
  } else if (!error && callbackError === "CredentialsSignin") {
    displayError = "Invalid email or password.";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage("");
    setShowResend(false);
    setIsLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    // --- START OF DEBUGGING ---
    // This is the crucial log.
    // Please check your BROWSER console (F12) for this output.
    console.log("--- DEBUG: SIGN-IN RESPONSE ---");
    console.log(JSON.stringify(res, null, 2));
    // --- END OF DEBUGGING ---

    if (res?.error) {
      // We will check for the generic error from the auth logs
      if (res.error === "CallbackRouteError") {
        // This is the most likely error, which we know is caused by "NotVerified"
        setError("Please check your inbox and verify your email first.");
        setShowResend(true); // Button explizit anzeigen
      } else if (res.error.includes("CredentialsSignin")) {
        setError("Invalid email or password.");
      } else {
        // Fallback that shows the actual error string
        setError(`An unknown error occurred. [Debug: ${res.error}]`);
      }
    } else if (res?.ok) {
      router.push("/dashboard");
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Please enter your email address above to resend the link.");
      setShowResend(true); 
      return;
    }
    setIsResending(true);
    setError("");
    setResendMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend email.");
        setShowResend(true); 
      } else {
        setResendMessage(data.message || "New verification link sent.");
        setShowResend(false); 
      }
    } catch (e) {
      setError("An error occurred. Please try again.");
      setShowResend(true);
    }

    setIsResending(false);
  };

  return (
    <div className="grid place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        
        <h1 className="mb-6 text-2xl font-semibold text-center">Welcome back</h1>

        {displayError && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive-foreground text-sm border border-destructive/20">
            <p>{displayError}</p>
            {showResend && (
              <Button
                variant="link"
                className="p-0 h-auto text-destructive-foreground font-bold mt-2"
                onClick={handleResend}
                disabled={isResending || !email}
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </Button>
            )}
          </div>
        )}

        {verified === "true" && !displayError && (
          <p className="mb-4 rounded-md bg-green-500/10 p-3 text-green-400 text-sm border border-green-500/20">
            Email verified! You can now log in.
          </p>
        )}

        {resendMessage && !displayError && (
          <p className="mb-4 rounded-md bg-green-500/10 p-3 text-green-400 text-sm border border-green-500/20">
            {resendMessage}
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-muted-foreground text-center">
          <p>
            Forgot your password?{" "}
            <Link
              className="text-primary hover:underline font-medium"
              href="/forgot-password"
            >
              Reset it
            </Link>
          </p>
          <p>
            New here?{" "}
            <Link
              className="text-primary hover:underline font-medium"
              href="/register"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}