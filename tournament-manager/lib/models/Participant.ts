import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IParticipant extends Document {
  tournamentId: mongoose.Schema.Types.ObjectId;
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
  matchHistory: mongoose.Schema.Types.ObjectId[];
}

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