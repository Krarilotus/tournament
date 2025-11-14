import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import slugify from "slugify";
import { validateTournamentRequest } from "@/lib/api/requestUtils";
import Tournament from "@/lib/models/Tournament";
import { revalidatePath } from "next/cache";

// We need a zod schema for the POST body
const publishSchema = z.object({
  publish: z.boolean(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Validate the user and tournament
  const validation = await validateTournamentRequest(request, context);
  if (!validation.ok) {
    return validation.response;
  }
  const { tournament } = validation;

  try {
    const body = await request.json();
    const validationResult = publishSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { publish } = validationResult.data;

    if (publish) {
      // --- PUBLISHING ---
      // Only generate a slug if one doesn't exist
      if (!tournament.urlSlug) {
        let slug = slugify(tournament.name, { lower: true, strict: true });
        let isUnique = false;
        let counter = 0;

        // Loop to ensure slug is unique
        while (!isUnique) {
          const potentialSlug = counter === 0 ? slug : `${slug}-${counter}`;
          const existing = await Tournament.findOne({
            urlSlug: potentialSlug,
          });
          if (!existing) {
            slug = potentialSlug;
            isUnique = true;
          } else {
            counter++;
            // If we've tried 10 times, append a nanoid and give up
            if (counter > 10) {
              slug = `${slug}-${nanoid(6)}`;
              isUnique = true;
            }
          }
        }
        tournament.urlSlug = slug;
      }
      tournament.status = "published";
    } else {
      tournament.status = "draft";
      // We keep the slug so the link doesn't get taken
    }

    await tournament.save();

    // Revalidate the settings page and the dashboard
    revalidatePath("/(dashboard)/dashboard/[id]/(control-panel)/settings", "page");
    revalidatePath("/(dashboard)/dashboard", "page");

    return NextResponse.json({
      status: tournament.status,
      urlSlug: tournament.urlSlug,
    });
  } catch (error) {
    console.error("Failed to publish tournament:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}