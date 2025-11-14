import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // Your auth handler from Phase 1
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import { createTournamentSchema } from '@/lib/validators'; // Our new schema

// --- GET All Tournaments for the logged-in user ---
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    await dbConnect();

    // --- (FIX) ---
    // Find tournaments where the user is EITHER the owner
    // OR their ID is in the adminIds array.
    const tournaments = await Tournament.find({
      $or: [
        { ownerId: session.user.id },
        { adminIds: session.user.id },
      ],
    }).sort({ createdAt: -1 }); // Show newest first
    // --- (END FIX) ---

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: 'Server error' }), {
      status: 500,
    });
  }
}

// --- POST (Create) a new Tournament ---
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }
    const ownerId = session.user.id;

    // Get the request body
    const body = await request.json();

    // Validate the body against our Zod schema
    const validation = createTournamentSchema.safeParse(body);

    if (!validation.success) {
      // If validation fails, send a 400 error
      return new NextResponse(
        JSON.stringify({ error: validation.error.format() }),
        {
          status: 400,
        }
      );
    }

    // Validation passed, get the clean data
    const {
      name,
      description,
      pointsWin,
      pointsDraw,
      pointsLoss,
      customStats,
      tieBreakers,
    } = validation.data;

    await dbConnect();

    // Transform flat points into the Map structure our model expects
    const pointSystem = new Map<string, number>();
    pointSystem.set('win', pointsWin);
    pointSystem.set('draw', pointsDraw);
    pointSystem.set('loss', pointsLoss);
    const tieBreakersForDB = tieBreakers.map((t) => t.value);

    // Create the new tournament document
    const newTournament = new Tournament({
      ownerId,
      name,
      description,
      settings: {
        pointSystem,
        customStats,
        tieBreakers: tieBreakersForDB,
      },
      status: 'draft', // Default status
      // We don't need to set adminIds: [] because the schema default does it
    });

    // Save it to the database
    await newTournament.save();

    // Return the new tournament with a 201 Created status
    return NextResponse.json(newTournament, { status: 201 });
  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: 'Server error' }), {
      status: 500,
    });
  }
}