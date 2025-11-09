import { z } from 'zod';

// Schema for creating a new tournament
export const createTournamentSchema = z.object({
  name: z.string().min(3, {
    message: 'Tournament name must be at least 3 characters.',
  }),
  description: z
    .string()
    .max(500, {
      message: 'Description cannot be longer than 500 characters.',
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

// Schema for updating an existing tournament
export const updateTournamentSchema = createTournamentSchema.partial();

// Base schema for a single participant's data
export const participantSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required.' })
    .max(100),
  customId: z.string().max(50).optional(),
});

// Relaxed row schema for the *batch* UI:
const participantRowSchema = z.object({
  name: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')), // "" is allowed
  customId: z.string().max(50).optional(),
});

// Schema for the batch-add participant form
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
        code: 'custom',
        message: 'You must add at least one participant.',
        path: ['participants'],
      });
    }
  });

// Schema for participants layout settings
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
