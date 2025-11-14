import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Tournament from "@/lib/models/Tournament";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteTournamentButton } from "./DeleteTournamentButton";
import { ImportTournamentDialog } from "./ImportTournamentDialog";
import { ExportTournamentDialog } from "./ExportTournamentDialog";

export const revalidate = 0;

interface ITournamentForClient {
  _id: string;
  name: string;
  description: string;
  status: "draft" | "published" | "running" | "completed" | "archived";
  createdAt: string;
  participantCount: number;
  urlSlug?: string | null;
}

async function getTournaments(userId: string): Promise<ITournamentForClient[]> {
  try {
    await dbConnect();
    const tournaments = await Tournament.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .select("name description status createdAt participants urlSlug")
      .lean();

    return tournaments.map(
      (t) =>
        ({
          _id: t._id.toString(),
          name: t.name,
          description: t.description || "No description provided.",
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          participantCount: t.participants.length,
          urlSlug: (t as any).urlSlug ?? null,
        } as ITournamentForClient)
    );
  } catch (error) {
    console.error("Failed to fetch tournaments:", error);
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <p>Unauthorized. Please log in.</p>;
  }

  const tournaments = await getTournaments(session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold md:text-3xl">My Tournaments</h1>
        <div className="flex flex-wrap gap-2">
          <ImportTournamentDialog />
          <ExportTournamentDialog />
          <Button asChild className="sm:ml-auto">
            <Link href="/dashboard/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Tournament
            </Link>
          </Button>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/50 p-12 text-center">
          <h3 className="text-lg font-medium text-muted-foreground">
            You don&apos;t have any tournaments yet.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by creating a new tournament.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create First Tournament
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            const manageHref =
              t.participantCount > 0
                ? `/dashboard/${t._id}/rounds`
                : `/dashboard/${t._id}`;

            const showPublicButton =
              t.status === "published" && t.urlSlug;

            return (
              <Card key={t._id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {t.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {t.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-xs text-muted-foreground">
                    Created on: {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link href={manageHref}>Manage</Link>
                    </Button>
                    {showPublicButton && (
                      <Button asChild variant="outline">
                        <Link href={`/${t.urlSlug}`} target="_blank">
                          Public
                        </Link>
                      </Button>
                    )}
                  </div>
                  <DeleteTournamentButton tournamentId={t._id} />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
