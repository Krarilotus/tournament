"use client";

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, Copy, Check, Loader2, ZapOff } from "lucide-react";
import { ITournament } from "@/lib/models/Tournament"; // Import your main interface

// This helper gets the base URL (e.g., http://localhost:3000)
function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Fallback for server-side (though this component is client-side)
  return "https://tournament.unofficialcrusaderpatch.com";
}

// We need to get the tournament data that was loaded by the server
type PublishCardProps = {
  tournament: {
    _id: string;
    status: ITournament["status"];
    urlSlug?: string | null;
  };
};

export function PublishTournamentCard({ tournament }: PublishCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(tournament.status);
  const [slug, setSlug] = useState(tournament.urlSlug);
  const [isLoading, setIsLoading] = useState(false);
  const [didCopy, setDidCopy] = useState(false);

  const publicUrl = `${getBaseUrl()}/${slug}`;
  const isPublished = status !== "draft";

  const handlePublish = async (publish: boolean) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament._id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
      });

      if (!res.ok) {
        throw new Error(
          publish ? "Failed to publish" : "Failed to unpublish"
        );
      }
      const data = await res.json();
      setStatus(data.status);
      setSlug(data.urlSlug);

      toast.success(
        publish ? "Tournament published!" : "Tournament unpublished."
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setDidCopy(true);
      setTimeout(() => setDidCopy(false), 2000);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Tournament Page</CardTitle>
        <CardDescription>
          {isPublished
            ? "Your tournament is live. Share the link below."
            : "Publish your tournament to get a shareable, read-only link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPublished ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="public-url">Your Public URL</Label>
              <div className="flex gap-2">
                <Input id="public-url" value={publicUrl} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {didCopy ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => handlePublish(false)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ZapOff className="mr-2 h-4 w-4" />
              )}
              Unpublish Tournament
            </Button>
          </>
        ) : (
          <Button onClick={() => handlePublish(true)} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Globe className="mr-2 h-4 w-4" />
            )}
            Publish to Public
          </Button>
        )}
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertTitle>
            {isPublished ? "Your tournament is visible" : "Your tournament is private"}
          </AlertTitle>
          <AlertDescription>
            {isPublished
              ? "Anyone with the link can view standings and match results."
              : "Only you (and co-admins) can see this tournament."}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}