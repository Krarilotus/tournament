import mongoose, { Schema, Document, models, Model } from "mongoose";

export interface IRound extends Document<mongoose.Types.ObjectId> {
  tournamentId: mongoose.Types.ObjectId;
  roundNumber: number;
  system: string; // e.g., "swiss-1v1", "n-ffa", "team-2v2"
  status: "pending" | "running" | "completed";
  matches: mongoose.Types.ObjectId[];

  // Per-round config & scoring
  systemOptions?: any;
  pointSystem?: Map<string, number>;
  // For FFA: place -> points, stored as string keys ("1", "2", "3"...)
  ffaPlacements?: Map<string, number>;
}

const roundSchema = new Schema<IRound>({
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: "Tournament",
    required: true,
  },
  roundNumber: { type: Number, required: true },
  system: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "running", "completed"],
    default: "pending",
  },
  matches: [{ type: Schema.Types.ObjectId, ref: "Match" }],

  systemOptions: {
    type: Schema.Types.Mixed,
    default: null,
  },
  pointSystem: {
    type: Map,
    of: Number,
    default: undefined,
  },
  ffaPlacements: {
    type: Map,
    of: Number,
    default: undefined,
  },
});

const Round: Model<IRound> =
  models.Round || mongoose.model<IRound>("Round", roundSchema);

export default Round;
