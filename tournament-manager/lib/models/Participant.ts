import mongoose, { Schema, Document, models, Model } from "mongoose";

// This is the Mongoose Document interface.
export interface IParticipant extends Document<mongoose.Types.ObjectId> {
  tournamentId: mongoose.Types.ObjectId;
  name: string;
  customId?: string;
  isActive: boolean;
  scores: {
    points: number;
    wins: number;
    losses: number;
    draws: number;
    buchholz: number;
    buchholz2: number;
    // Any additional custom stats (GameWins, Kills, etc.)
    [key: string]: any;
  };
  matchHistory: mongoose.Types.ObjectId[];
}

// This is a simple type for data serialized for the client.
export type SerializedParticipant = {
  _id: string;
  tournamentId: string;
  name: string;
  customId?: string;
  isActive: boolean;
  scores: {
    points: number;
    wins: number;
    losses: number;
    draws: number;
    buchholz: number;
    buchholz2: number;
    // Any additional custom stats
    [key: string]: any;
  };
  matchHistory: string[];
};

const defaultScores = {
  points: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  buchholz: 0,
  buchholz2: 0,
};

const participantSchema = new Schema<IParticipant>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    name: { type: String, required: true },
    customId: { type: String },
    isActive: { type: Boolean, default: true },

    // IMPORTANT: treat scores as Mixed so Mongoose doesn't strip unknown keys
    scores: {
      type: Schema.Types.Mixed,
      default: () => ({ ...defaultScores }),
    },

    matchHistory: [{ type: Schema.Types.ObjectId, ref: "Match" }],
  },
  {
    minimize: false, // keep empty scores object
    strict: false,   // allow extra stuff if we ever add more fields
  }
);

// This line prevents Mongoose from recompiling the model in Next.js dev mode.
const Participant: Model<IParticipant> =
  models.Participant || mongoose.model<IParticipant>("Participant", participantSchema);

export default Participant;
