import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { validateOwnerRequest } from '@/lib/api/requestUtils';
import Tournament from '@/lib/models/Tournament';
import User from '@/lib/models/User';
import { revalidatePath } from 'next/cache';

/**
 * POST: Transfers ownership to another user (Owner-only)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Validate this request is from the CURRENT owner
  const validation = await validateOwnerRequest(request, context);
  if (!validation.ok) {
    return validation.response;
  }
  // We get the full Mongoose document here
  const { tournament, userId: currentOwnerId } = validation;
  const tournamentId = tournament._id;

  try {
    const { newOwnerId } = await request.json();
    if (
      !newOwnerId ||
      !mongoose.Types.ObjectId.isValid(newOwnerId)
    ) {
      return NextResponse.json(
        { message: 'Invalid new owner ID' },
        { status: 400 }
      );
    }

    // 2. Check that the new owner is a real user
    const newOwner: any = await User.findById(newOwnerId);
    if (!newOwner) {
      return NextResponse.json(
        { message: 'New owner user not found' },
        { status: 404 }
      );
    }
    
    // 3. Check if new owner is already the owner
    if (tournament.ownerId.toString() === newOwnerId) {
      return NextResponse.json(
        { message: 'This user is already the owner' },
        { status: 400 }
      );
    }

    // 4. Perform the swap
    tournament.ownerId = newOwner._id as mongoose.Types.ObjectId;
    if (!tournament.adminIds) {
      tournament.adminIds = [];
    }
    tournament.adminIds = tournament.adminIds.filter(
      (id) => id.toString() !== newOwner._id.toString()
    );

    // Demote the old owner to be an admin (if not already one)
    const isOldOwnerAdmin = tournament.adminIds.some(
      (id) => id.toString() === currentOwnerId
    );
    if (!isOldOwnerAdmin) {
      tournament.adminIds.push(new mongoose.Types.ObjectId(currentOwnerId));
    }

    await tournament.save();

    revalidatePath(
      `/(dashboard)/dashboard/${tournamentId}/(control-panel)/settings`
    );
    
    return NextResponse.json(
      { message: 'Ownership transferred successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Failed to transfer ownership:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}