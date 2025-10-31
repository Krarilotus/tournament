"use client";

import { useState } from "react";
import Link from "next/link";

// Import the new shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    else {
      setMessage(data.message);
      // Clear form on success
      setName("");
      setEmail("");
      setPassword("");
    }
  };

  return (
    <div className="grid place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        
        <h1 className="mb-6 text-2xl font-semibold text-center">Create your account</h1>
        
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive-foreground text-sm border border-destructive/20">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-md bg-green-500/10 p-3 text-green-400 text-sm border border-green-500/20">
            {message}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
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
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full">
            Register
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link className="text-primary hover:underline font-medium" href="/login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}