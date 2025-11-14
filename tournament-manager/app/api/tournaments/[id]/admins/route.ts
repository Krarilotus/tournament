import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Tournament from '@/lib/models/Tournament';
import User from '@/lib/models/User';
import { revalidatePath } from 'next/cache';
import {
  validateAdminAccess,
  validateOwnerRequest,
} from '@/lib/api/requestUtils';

/**
 * GET: Fetches the current list of admins for a tournament (Admin or Owner)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const validation = await validateAdminAccess(request, context);
  if (!validation.ok) {
    return validation.response;
  }
  const { tournament } = validation;

  try {
    // Populate owner (required)
    await tournament.populate({
      path: 'ownerId',
      model: 'User',
      select: 'name email image',
    });

    // Defensively populate adminIds only if it exists
    if (tournament.adminIds && tournament.adminIds.length > 0) {
      await tournament.populate({
        path: 'adminIds',
        model: 'User',
        select: 'name email image',
      });
    }

    return NextResponse.json({
      owner: tournament.ownerId,
      admins: tournament.adminIds || [], // Always return an array
    });
  } catch (error) {
    console.error('Failed to get admins:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Adds a new admin to the tournament (Owner-only)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Validate owner access
  const validation = await validateOwnerRequest(request, context);
  if (!validation.ok) {
    return validation.response;
  }
  // We get the FULL Mongoose document from our validator
  const { tournament } = validation;

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // 2. Find the user (case-insensitive)
    const userToAdd: any = await User.findOne({
      email: new RegExp(`^${email}$`, 'i'),
    });
    if (!userToAdd) {
      return NextResponse.json(
        { message: 'User with that email not found' },
        { status: 404 }
      );
    }
    const userIdToAdd: mongoose.Types.ObjectId = userToAdd._id;

    // 3. Check for duplicates
    if (userIdToAdd.toString() === tournament.ownerId.toString()) {
      return NextResponse.json(
        { message: 'Cannot add the owner as an admin' },
        { status: 400 }
      );
    }

    // --- Explicitly handle the array ---
    if (!tournament.adminIds) {
      tournament.adminIds = [];
    }

    const isAlreadyAdmin = tournament.adminIds.some(
      (id) => id.toString() === userIdToAdd.toString()
    );

    if (isAlreadyAdmin) {
      return NextResponse.json(
        { message: 'This user is already an admin' },
        { status: 409 } // 409 Conflict
      );
    }

    // 4. Add the new admin and save
    tournament.adminIds.push(userIdToAdd);
    await tournament.save();

    revalidatePath(
      `/(dashboard)/dashboard/${tournament._id}/(control-panel)/settings`
    );
    return NextResponse.json(
      { message: 'Admin added successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to add admin:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Removes an admin from the tournament (Owner-only)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Validate owner access
  const validation = await validateOwnerRequest(request, context);
  if (!validation.ok) {
    return validation.response;
  }
  const { tournament } = validation;

  try {
    const { userIdToRemove } = await request.json();
    if (!userIdToRemove) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    if (tournament.adminIds) {
      tournament.adminIds = tournament.adminIds.filter(
        (id) => id.toString() !== userIdToRemove
      );
      await tournament.save();
    }

    revalidatePath(
      `/(dashboard)/dashboard/${tournament._id}/(control-panel)/settings`
    );
    return NextResponse.json(
      { message: 'Admin removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to remove admin:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}