import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
import Tournament, { ITournament } from '@/lib/models/Tournament';
import { Session } from 'next-auth';

type ValidatedRequest = {
  ok: true;
  tournament: ITournament;
  session: Session;
  userId: string;
  tieBreakers: string[];
  scoreKeys: string[];
};
type ErrorRequest = {
  ok: false;
  response: NextResponse;
};

// --- (Base Request) ---
// We can rename this from 'ValidatedOwnerRequest' to be more generic,
// as 'validateAdminAccess' will also return this shape.
type ValidatedBaseRequest = {
  ok: true;
  tournament: ITournament;
  session: Session;
  userId: string;
};

// --- (NEW) Public Request Type ---
// A session is optional for public requests
type ValidatedPublicRequest = {
  ok: true;
  tournament: ITournament;
  session: Session | null;
  tieBreakers: string[];
  scoreKeys: string[];
};

const BUILTIN_TIEBREAKERS = new Set<string>([
  'points',
  'wins',
  'losses',
  'draws',
  'buchholz',
  'buchholz2',
  'directComparison',
]);

/**
 * A reusable checker for tournament admin/owner access.
 */
export function checkAdminAccess(
  tournament: ITournament,
  session: Session | null
): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const isOwner = tournament.ownerId.toString() === userId;
  const isAdmin =
    tournament.adminIds?.some((id) => id.toString() === userId) ?? false;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/**
 * Reusable checker for *Owner-Only* access
 */
export function checkOwnerAccess(
  tournament: ITournament,
  session: Session | null
): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const isOwner = tournament.ownerId.toString() === userId;

  if (!isOwner) {
    return NextResponse.json(
      { message: 'Forbidden: Owner access required' },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Base validation function to get session, user, and tournament.
 * Used internally by the more specific validators.
 */
async function baseValidateRequest(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<
  | { ok: true; tournament: ITournament; session: Session; userId: string }
  | { ok: false; response: NextResponse }
> {
  await dbConnect();

  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    };
  }
  const userId = session.user.id;

  const params = await context.params;
  const { id: tournamentId } = params;

  if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Invalid Tournament ID' },
        { status: 400 }
      ),
    };
  }

  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Tournament not found' },
        { status: 404 }
      ),
    };
  }

  return { ok: true, tournament, session, userId };
}

/**
 * Validates a tournament API request for ADMIN or OWNER access.
 * This function *only* checks permissions.
 */
export async function validateAdminAccess(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<ValidatedBaseRequest | ErrorRequest> {
  const baseValidation = await baseValidateRequest(req, context);
  if (!baseValidation.ok) {
    return baseValidation;
  }
  const { tournament, session, userId } = baseValidation;

  const accessError = checkAdminAccess(tournament, session);
  if (accessError) {
    return { ok: false, response: accessError };
  }

  return {
    ok: true,
    tournament,
    session,
    userId,
  };
}

/**
 * Validates a tournament API request for OWNER-ONLY access.
 * This function *only* checks permissions.
 */
export async function validateOwnerRequest(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<ValidatedBaseRequest | ErrorRequest> {
  const baseValidation = await baseValidateRequest(req, context);
  if (!baseValidation.ok) {
    return baseValidation;
  }
  const { tournament, session, userId } = baseValidation;

  const accessError = checkOwnerAccess(tournament, session);
  if (accessError) {
    return { ok: false, response: accessError };
  }

  return {
    ok: true,
    tournament,
    session,
    userId,
  };
}

/**
 * Validates a full request for game logic (Admin/Owner access
 * AND tie-breaker validation).
 */
export async function validateTournamentRequest(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<ValidatedRequest | ErrorRequest> {
  const adminValidation = await validateAdminAccess(req, context);
  if (!adminValidation.ok) {
    return adminValidation;
  }
  const { tournament, session, userId } = adminValidation;

  const tieBreakers: string[] = tournament.settings.tieBreakers || ['points'];
  const customStats: string[] = tournament.settings.customStats || [];

  for (const tb of tieBreakers) {
    if (BUILTIN_TIEBREAKERS.has(tb)) continue;
    if (!customStats.includes(tb)) {
      const message = `Invalid tie-breaker "${tb}". It is not a built-in stat and not defined as a custom stat for this tournament.`;
      console.error(message, { tournamentId: tournament._id });
      return {
        ok: false,
        response: NextResponse.json({ message }, { status: 500 }),
      };
    }
  }

  const scoreKeys = tieBreakers.filter((tb) => tb !== 'directComparison');

  return {
    ok: true,
    tournament,
    session,
    userId,
    tieBreakers,
    scoreKeys,
  };
}

/**
 * (NEW) Validates a request for PUBLIC or ADMIN access.
 * If tournament is "published", allows public (no session) access.
 * If tournament is "draft", falls back to admin-only access.
 */
export async function validatePublicAccess(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<ValidatedPublicRequest | ErrorRequest> {
  await dbConnect();

  // 1. Get session, but it's optional
  const session = await auth();

  // 2. Get Tournament
  const params = await context.params;
  const { id: tournamentId } = params;

  if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Invalid Tournament ID' },
        { status: 400 }
      ),
    };
  }

  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Tournament not found' },
        { status: 404 }
      ),
    };
  }

  // 3. Check permissions
  const isPublished = tournament.status === 'published';

  if (!isPublished) {
    // If not published, MUST be an admin.
    const adminAccessError = checkAdminAccess(tournament, session);
    if (adminAccessError) {
      return { ok: false, response: adminAccessError };
    }
  }
  // If it IS published, we allow access (session can be null).

  // 4. Validate and return tie-breakers (same as admin logic)
  const tieBreakers: string[] = tournament.settings.tieBreakers || ['points'];
  const customStats: string[] = tournament.settings.customStats || [];

  for (const tb of tieBreakers) {
    if (BUILTIN_TIEBREAKERS.has(tb)) continue;
    if (!customStats.includes(tb)) {
      const message = `Invalid tie-breaker "${tb}". It is not a built-in stat and not defined as a custom stat for this tournament.`;
      console.error(message, { tournamentId: tournament._id });
      return {
        ok: false,
        response: NextResponse.json({ message }, { status: 500 }),
      };
    }
  }

  const scoreKeys = tieBreakers.filter((tb) => tb !== 'directComparison');

  return {
    ok: true,
    tournament,
    session, // (can be null)
    tieBreakers,
    scoreKeys,
  };
}