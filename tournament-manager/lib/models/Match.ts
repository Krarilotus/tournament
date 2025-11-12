import mongoose, { Schema, Document, models, Model } from "mongoose";

export interface IMatchParticipant {
  participantId: mongoose.Types.ObjectId;
  team?: string; // "A" | "B" etc
  result?: string; // "win" | "loss" | "draw" | "bye" | ordinal like "1st"
  pointsAwarded?: number;
  customStats?: Map<string, number>;
}

export interface IMatch extends Document<mongoose.Types.ObjectId> {
  tournamentId: mongoose.Types.ObjectId;
  roundId: mongoose.Types.ObjectId;
  status: "pending" | "completed";
  participants: IMatchParticipant[];
  winner?: mongoose.Types.ObjectId;
  isDraw?: boolean;

  // NEW: per-match team names, keyed by team label ("A", "B", etc)
  teamNames?: Map<string, string>;
}

const matchParticipantSchema = new Schema<IMatchParticipant>(
  {
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
    },
    team: { type: String },
    result: { type: String },
    pointsAwarded: { type: Number, default: 0 },
    customStats: {
      type: Map,
      of: Number,
      default: undefined,
    },
  },
  { _id: false }
);

const matchSchema = new Schema<IMatch>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    roundId: {
      type: Schema.Types.ObjectId,
      ref: "Round",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    participants: [matchParticipantSchema],
    winner: { type: Schema.Types.ObjectId, ref: "Participant" },
    isDraw: { type: Boolean, default: false },

    // NEW: map of team label -> team name ("A" -> "Blue Squad")
    teamNames: {
      type: Map,
      of: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

const Match: Model<IMatch> =
  models.Match || mongoose.model<IMatch>("Match", matchSchema);

export default Match;
