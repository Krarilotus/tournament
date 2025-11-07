import { z } from 'zod';

// Schema for creating a new tournament
export const createTournamentSchema = z.object({
  name: z.string().min(3, {
    message: 'Tournament name must be at least 3 characters.',
  }),
  description: z.string().max(500, {
    message: 'Description cannot be longer than 500 characters.'
  }).optional(),
  
  pointsWin: z.number().int(),
  pointsDraw: z.number().int(),
  pointsLoss: z.number().int(),

  customStats: z.array(z.string().min(1).max(30)),
  
  tieBreakers: z.array(z.object({
    value: z.string(),
  })),
});

// Schema for updating an existing tournament
export const updateTournamentSchema = createTournamentSchema.partial();