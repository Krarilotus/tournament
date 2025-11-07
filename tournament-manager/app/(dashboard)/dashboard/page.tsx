import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { auth } from '@/lib/auth'; // To get the user ID
import dbConnect from '@/lib/db'; // To query the DB
import Tournament from '@/lib/models/Tournament'; // Our new model
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteTournamentButton } from './DeleteTournamentButton';

// Ensure the page is always server-rendered to get fresh data
export const revalidate = 0;

// Define the shape of our tournament document for type safety
// We convert _id and createdAt to string for the client
interface ITournamentForClient {
  _id: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'running' | 'completed' | 'archived';
  createdAt: string;
}

// This is a React Server Component (RSC) function
// It runs *only* on the server to fetch data
async function getTournaments(userId: string): Promise<ITournamentForClient[]> {
  try {
    await dbConnect();
    const tournaments = await Tournament.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .lean(); // .lean() gives us plain JS objects, not Mongoose docs
      
    // Serialize data for the client: convert complex types (like ObjectId) to strings
    return tournaments.map(t => ({
      ...t,
      _id: t._id.toString(),
      createdAt: t.createdAt.toISOString(),
      // Ensure description is a string, not null/undefined
      description: t.description || 'No description provided.', 
    })) as ITournamentForClient[];
  } catch (error) {
    console.error("Failed to fetch tournaments:", error);
    return []; // Return an empty array on error
  }
}

// The page is now an 'async' function, making it a Server Component
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {    
    // This check was failing. 'force-dynamic' should fix it.
    return <p>Unauthorized. Please log in.</p>; 
  }

  const tournaments = await getTournaments(session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">My Tournaments</h1>
        <Button asChild>
          <Link href="/dashboard/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Tournament
          </Link>
        </Button>
      </div>

      {/* --- DYNAMIC CONTENT --- */}
      {tournaments.length === 0 ? (
        // RENDER YOUR EMPTY STATE (Preserved 1-to-1)
        <div className="flex-1 rounded-lg border border-dashed border-muted-foreground/50 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
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
        // RENDER THE TOURNAMENT LIST
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Card key={t._id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <Badge variant="outline" className="capitalize shrink-0">
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
              <CardFooter className="flex justify-between">
                <Button asChild variant="outline">
                  <Link href={`/dashboard/${t._id}/settings`}>Settings</Link>
                </Button>
                {/* The Delete button is a separate Client Component 
                  to handle its own state and API call.
                */}
                <DeleteTournamentButton tournamentId={t._id} />
                
                <Button asChild>
                  <Link href={`/dashboard/${t._id}`}>Manage</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}