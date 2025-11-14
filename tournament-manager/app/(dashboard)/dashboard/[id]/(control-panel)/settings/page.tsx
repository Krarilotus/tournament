"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { updateTournamentSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Download, Copy, ArrowLeft } from "lucide-react";
import React, { useEffect, useState, use } from "react";
import { TieBreakerDnd } from "../_components/TieBreakerDnd";
import { ManageAdminsCard } from "../_components/ManageAdminsCard";

export type UpdateTournamentForm = z.infer<typeof updateTournamentSchema>;

export default function TournamentSettingsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [statInput, setStatInput] = useState("");

  // publish-related state
  const [publishStatus, setPublishStatus] = useState<string>("draft");
  const [urlSlug, setUrlSlug] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const form = useForm<UpdateTournamentForm>({
    resolver: zodResolver(updateTournamentSchema),
    defaultValues: {
      name: "",
      description: "",
      pointsWin: 0,
      pointsDraw: 0,
      pointsLoss: 0,
      customStats: [],
      tieBreakers: [],
    },
  });

  const customStats = form.watch("customStats");

  useEffect(() => {
    if (!params.id) return;

    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/tournaments/${params.id}`);
        if (!res.ok) {
           // Handle 403 Forbidden specifically if needed
           if (res.status === 403) {
            toast.error("You don't have permission to view these settings.");
            // Optionally redirect
            // router.push("/dashboard");
          }
          throw new Error("Failed to fetch tournament");
        }

        const data = await res.json();
        setPublishStatus(data.status || "draft");
        setUrlSlug(data.urlSlug ?? null);

        const dbTiebreakers = data.settings.tieBreakers || [];
        const tiebreakersToLoad =
          dbTiebreakers.length > 0 ? dbTiebreakers : ["points"];

        form.reset({
          name: data.name,
          description: data.description,
          pointsWin: data.settings.pointsWin,
          pointsDraw: data.settings.pointsDraw,
          pointsLoss: data.settings.pointsLoss,
          customStats: data.settings.customStats,
          tieBreakers: tiebreakersToLoad.map((val: string) => ({ value: val })),
        });
      } catch (error) {
        console.error(error);
        if ((error as Error).message.includes("permission")) {
          // Already handled above
        } else {
          toast.error("Could not load tournament data.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournament();
  }, [params.id, form, router]); // Added router to dep array

  const handleAddStat = () => {
    if (statInput.trim()) {
      const currentStats = form.getValues("customStats") || [];
      const newStat = statInput.trim();

      if (!currentStats.includes(newStat)) {
        form.setValue("customStats", [...currentStats, newStat]);
        setStatInput("");
      } else {
        toast.warning("This stat already exists.");
      }
    }
  };

  const handleRemoveStat = (statToRemove: string) => {
    const currentStats = form.getValues("customStats") || [];
    form.setValue(
      "customStats",
      currentStats.filter((s) => s !== statToRemove)
    );
  };

  const onSubmit: SubmitHandler<UpdateTournamentForm> = async (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
        settings: {
          pointsWin: values.pointsWin,
          pointsDraw: values.pointsDraw,
          pointsLoss: values.pointsLoss,
          customStats: values.customStats,
          tieBreakers: values.tieBreakers
            ? values.tieBreakers.map((t) => t.value)
            : [],
        },
      };

      const res = await fetch(`/api/tournaments/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
         const data = await res.json().catch(() => null);
        if (res.status === 403) {
          throw new Error(data?.message || "Forbidden: You do not have permission to edit.");
        }
        throw new Error(data?.message || "Failed to update tournament");
      }

      toast.success("Tournament settings saved!");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred. Please try again.");
    }
  };

  const handlePublishToggle = async (nextPublish: boolean) => {
    if (!params.id) return;

    setIsPublishing(true);
    try {
      const res = await fetch(`/api/tournaments/${params.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: nextPublish }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
         if (res.status === 403) {
          throw new Error(data?.message || "Forbidden: You do not have permission.");
        }
        throw new Error(data?.message || "Failed to update publish status");
      }

      const data = await res.json();
      setPublishStatus(data.status);
      setUrlSlug(data.urlSlug ?? null);

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
    if (!origin || !urlSlug) return;
    const url = `${origin}/${urlSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public URL copied to clipboard.");
    } catch {
      toast.error("Could not copy URL. You can copy it manually.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  const isPublished = publishStatus === "published";
  const publicUrl = urlSlug && origin ? `${origin}/${urlSlug}` : "";

  return (
    <div className="space-y-8">
      {/* Header – same pattern as Rounds */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Tournament Settings
        </h2>
        <Button
          type="submit"
          form="tournament-settings-form"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>

      {/* --- (NEW) MANAGE ADMINS CARD --- */}
      <ManageAdminsCard tournamentId={params.id} />

      {/* Publish & Share card */}
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
              {urlSlug && (
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
                      <Link href={`/${urlSlug}`} target="_blank">
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This tournament is currently private. When you publish it, a
              unique URL will be generated that anyone can view in
              read-only mode.
            </p>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form
          id="tournament-settings-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scoring System</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pointsWin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points for a Win</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        {...form.register(field.name, { valueAsNumber: true })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pointsDraw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points for a Draw</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        {...form.register(field.name, { valueAsNumber: true })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pointsLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points for a Loss</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        {...form.register(field.name, { valueAsNumber: true })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Statistics</CardTitle>
              <CardDescription>
                Define custom stats to track (e.g., "Kills", "Flags"). This will
                add fields to match reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="New stat name"
                  value={statInput}
                  onChange={(e) => setStatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddStat();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddStat}
                >
                  Add
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {form.watch("customStats")?.map((stat) => (
                  <Badge key={stat} variant="secondary">
                    {stat}
                    <button
                      type="button"
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => handleRemoveStat(stat)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {stat}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tie-Breaker Priority</CardTitle>
              <CardDescription>
                Drag and drop to set the priority. "Points" is always locked to
                the top.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TieBreakerDnd
                control={form.control}
                customStats={customStats || []}
              />
            </CardContent>
          </Card>

          {/* Export card */}
          <Card>
            <CardHeader>
              <CardTitle>Archive & Export</CardTitle>
              <CardDescription>
                Download a full JSON backup of this tournament. This file
                contains all participants, teams, rounds, and matches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link
                  href={`/api/tournaments/${params.id}/export`}
                  download
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Tournament Data
                </Link>
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}