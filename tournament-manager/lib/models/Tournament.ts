import mongoose, { Schema, Document, models, Model } from 'mongoose';

// Layout type stored per tournament
export interface IParticipantsLayout {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  sorting: { id: string; desc: boolean }[];
}

// Interface for type-checking
export interface ITournament extends Document<mongoose.Types.ObjectId> {
  ownerId: mongoose.Types.ObjectId;
  adminIds: mongoose.Types.ObjectId[];
  name: string;
  description?: string;
  urlSlug?: string;
  status: 'draft' | 'published' | 'running' | 'completed' | 'archived';
  participants: mongoose.Types.ObjectId[];
  rounds: mongoose.Types.ObjectId[];
  settings: {
    pointSystem: Map<string, number>;
    customStats: string[];
    tieBreakers: string[];
    participantsLayout?: IParticipantsLayout;
  };
  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // --- (FIX) ---
    adminIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [], // <-- Add this default value
    },
    // --- (END FIX) ---
    name: { type: String, required: true },
    description: { type: String },
    urlSlug: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'running', 'completed', 'archived'],
      default: 'draft',
    },
    participants: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
    rounds: [{ type: Schema.Types.ObjectId, ref: 'Round' }],
    settings: {
      pointSystem: { type: Map, of: Number },
      customStats: [String],
      tieBreakers: [String],
      participantsLayout: {
        columnOrder: {
          type: [String],
          default: [],
        },
        columnVisibility: {
          // Map<string, boolean>
          type: Map,
          of: Boolean,
          default: {},
        },
        sorting: {
          type: [
            {
              id: { type: String },
              desc: { type: Boolean },
            },
          ],
          default: [],
        },
      },
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// This line prevents Mongoose from recompiling the model in Next.js dev mode
const Tournament: Model<ITournament> =
  models.Tournament ||
  mongoose.model<ITournament>('Tournament', tournamentSchema);

export default Tournament;