"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2 } from "lucide-react";
import { ITournament } from "@/lib/models/Tournament";

type PublishCardProps = {
  tournamentId: string;
  initialStatus: ITournament["status"];
  initialSlug: string | null | undefined;
  origin: string; // Pass origin as a prop
};

export function PublishTournamentCard({
  tournamentId,
  initialStatus,
  initialSlug,
  origin,
}: PublishCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [slug, setSlug] = useState(initialSlug);
  const [isPublishing, setIsPublishing] = useState(false);

  const isPublished = status === "published";
  const publicUrl = slug && origin ? `${origin}/${slug}` : "";

  const handlePublishToggle = async (nextPublish: boolean) => {
    if (!tournamentId) return;

    setIsPublishing(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: nextPublish }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 403) {
          throw new Error(
            data?.message || "Forbidden: You do not have permission."
          );
        }
        throw new Error(data?.message || "Failed to update publish status");
      }

      const data = await res.json();
      setStatus(data.status);
      setSlug(data.urlSlug ?? null);

      toast.success(
        nextPublish
          ? "Tournament published. Public link is ready."
          : "Tournament set back to draft."
      );
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Could not change publish status.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyPublicUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public URL copied to clipboard.");
    } catch {
      toast.error("Could not copy URL. You can copy it manually.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Publish & Share</CardTitle>
            <CardDescription>
              Make this tournament viewable at a public URL.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isPublished ? "default" : "secondary"}
              className="text-xs capitalize"
            >
              {isPublished ? "Published" : "Draft"}
            </Badge>
            <Button
              type="button"
              variant={isPublished ? "outline" : "default"}
              onClick={() => handlePublishToggle(!isPublished)}
              disabled={isPublishing}
            >
              {isPublishing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPublished ? (
          <>
            <p className="text-sm text-muted-foreground">
              This tournament is live. Share the public link below:
            </p>
            {slug && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  readOnly
                  value={publicUrl}
                  className="font-mono text-xs"
                />
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPublicUrl}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/${slug}`} target="_blank">
                      Open
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This tournament is currently private. When you publish it, a unique
            URL will be generated that anyone can view in read-only mode.
          </p>
        )}
      </CardContent>
    </Card>
  );
}