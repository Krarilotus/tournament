import mongoose, { Schema, Document, models, Model } from "mongoose";

export interface ITeam extends Document<mongoose.Types.ObjectId> {
  tournamentId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  
  // The members of this team
  playerIds: mongoose.Types.ObjectId[];
  
  // A sorted, |-delimited string of player IDs for fast lookups
  // e.g., "60a...1|60a...2"
  lookupKey: string; 
  
  // The user-defined name, e.g., "Blue Squad"
  customName?: string;
  
  // The auto-generated name, e.g., "Team A"
  // We can use this as a fallback if customName is not set
  genericName?: string; 
}

const teamSchema = new Schema<ITeam>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    playerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Participant",
      },
    ],
    lookupKey: {
      type: String,
      required: true,
      index: true,
    },
    customName: {
      type: String,
    },
    genericName: {
      type: String,
    },
  },
  { timestamps: true }
);

// Ensure that a team (defined by its players) is unique
// within a tournament.
teamSchema.index({ tournamentId: 1, lookupKey: 1 }, { unique: true });

const Team: Model<ITeam> =
  models.Team || mongoose.model<ITeam>("Team", teamSchema);

export default Team;