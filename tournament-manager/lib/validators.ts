// lib/validators.ts
import { z } from "zod";

// ------------------------------------------------------
// Tournament create / update
// ------------------------------------------------------

export const createTournamentSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: "Tournament name must be at least 3 characters.",
    }),
  description: z
    .string()
    .max(500, {
      message: "Description cannot be longer than 500 characters.",
    })
    .optional(),

  pointsWin: z.number().int(),
  pointsDraw: z.number().int(),
  pointsLoss: z.number().int(),

  customStats: z.array(z.string().min(1).max(30)),

  tieBreakers: z.array(
    z.object({
      value: z.string(),
    })
  ),
});

export const updateTournamentSchema = createTournamentSchema.partial();

// ------------------------------------------------------
// Participants - batch add + layout
// ------------------------------------------------------

export const participantSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required." })
    .max(100),
  customId: z.string().max(50).optional(),
});

const participantRowSchema = z.object({
  name: z
    .string()
    .max(100)
    .optional()
    .or(z.literal("")),
  customId: z.string().max(50).optional(),
});

export const batchAddParticipantsSchema = z
  .object({
    participants: z.array(participantRowSchema),
  })
  .superRefine((data, ctx) => {
    const hasNonEmpty = data.participants.some(
      (p) => p.name && p.name.trim().length > 0
    );

    if (!hasNonEmpty) {
      ctx.addIssue({
        code: "custom",
        message: "You must add at least one participant.",
        path: ["participants"],
      });
    }
  });

export const participantsLayoutSchema = z.object({
  columnOrder: z.array(z.string()),
  columnVisibility: z.record(z.string(), z.boolean()),
  sorting: z.array(
    z.object({
      id: z.string(),
      desc: z.boolean(),
    })
  ),
});

// ------------------------------------------------------
// Round generation - matchmaking config
// ------------------------------------------------------

// Reusable options for any Swiss-based system (1v1, Teams)
const swissOptionsSchema = z.object({
  variant: z.enum(["GENERIC", "FIDE_DUTCH"]).default("GENERIC"),
  avoidRematches: z.boolean().default(true),
  relevantRoundIds: z.array(z.string()).default([]),
  onConflict: z.enum(["FLOAT_DOWN", "PAIR_ANYWAY"]).default("FLOAT_DOWN"),
  byePoints: z.number().optional(),
});

// 1. Schema for Swiss 1v1
const swiss1v1Schema = z.object({
  system: z.literal("swiss-1v1"),
  options: swissOptionsSchema,
});

// 2. Schema for N-Player FFA
const nffaSchema = z.object({
  system: z.literal("n-ffa"),
  options: z
    .object({
      groupSize: z
        .number()
        .min(2, {
          message: "Group size must be at least 2",
        })
        .max(16, {
          message: "Group size cannot be larger than 16",
        }),
      groupMethod: z
        .enum(["SIMPLE_CHUNK", "SWISS_GROUPING"])
        .default("SIMPLE_CHUNK"),
      // place ("1", "2", "3", ...) -> points
      ffaPlacements: z.record(z.string(), z.number()).optional(),
    })
    // <-- MODIFIED: Merge the Swiss options, omitting 'variant' -->
    .merge(swissOptionsSchema.omit({ variant: true })),
});

// 3. Schema for Team vs. Team
const teamSchema = z.object({
  system: z.literal("team-2v2"),
  options: swissOptionsSchema.merge(
    z.object({
      teamSize: z
        .number()
        .int()
        .min(2, "Team size must be at least 2")
        .max(50, "Team size cannot exceed 50")
        .default(2),

      teamMethod: z
        .enum(["BALANCE_FIRST_LAST", "RANDOM"])
        .default("BALANCE_FIRST_LAST"),

      // NEW: persistence mode
      teamPersistenceMode: z
        .enum(["NEW_TEAMS", "REUSE_FROM_ROUND"])
        .default("NEW_TEAMS"),

      // If REUSE_FROM_ROUND, this roundId is the team template
      teamPersistenceRoundId: z.string().optional().nullable(),
    })
  ),
});

// 4. Schema for Custom/Manual Seeding (NEW)
// These schemas mirror your front-end MatchSeed types
const matchSeedParticipantSchema = z.object({
  participantId: z.string(),
  team: z.string().optional(),
  result: z.string().optional(),
  pointsAwarded: z.number().optional(),
  customStats: z.record(z.string(), z.number()).optional(),
});

const matchSeedSchema = z.object({
  status: z.enum(["pending", "completed"]),
  participants: z.array(matchSeedParticipantSchema).min(1),
  teamNames: z.record(z.string(), z.string()).optional(),
});

const customSchema = z.object({
  system: z.literal("custom"),
  matchSeeds: z.array(matchSeedSchema).min(1, {
    message: "You must create at least one match.",
  }),
});

// Discriminated union for form + API
export const generateRoundBodySchema = z.discriminatedUnion("system", [
  swiss1v1Schema,
  nffaSchema,
  teamSchema,
  customSchema, // <-- ADDED
]);

export type GenerateRoundFormData = z.infer<typeof generateRoundBodySchema>;

// ------------------------------------------------------
// Team Renaming
// ------------------------------------------------------

export const updateTeamNameSchema = z.object({
  customName: z
    .string()
    .min(1, { message: "Team name cannot be empty." })
    .max(100, { message: "Team name is too long." }),
});