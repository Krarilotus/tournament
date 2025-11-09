import mongoose, { Schema, Document, models, Model } from 'mongoose';

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
    [key: string]: any; // For dynamic custom stats
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
    [key: string]: any;
  };
  matchHistory: string[];
};

const participantSchema = new Schema<IParticipant>({
  tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  name: { type: String, required: true },
  customId: { type: String },
  isActive: { type: Boolean, default: true },
  scores: {
    points: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    buchholz: { type: Number, default: 0 },
    buchholz2: { type: Number, default: 0 },
    // Custom stats will be added dynamically here
  },
  matchHistory: [{ type: Schema.Types.ObjectId, ref: 'Match' }]
}, { minimize: false }); // `minimize: false` saves empty 'scores' object

const Participant: Model<IParticipant> = models.Participant || mongoose.model<IParticipant>('Participant', participantSchema);

export default Participant;