import mongoose, { Schema, Document, models, Model } from 'mongoose';

// Interface for type-checking
export interface ITournament extends Document {
  ownerId: mongoose.Schema.Types.ObjectId;
  name: string;
  description?: string;
  urlSlug?: string;
  status: 'draft' | 'published' | 'running' | 'completed' | 'archived';
  participants: mongoose.Schema.Types.ObjectId[];
  rounds: mongoose.Schema.Types.ObjectId[];
  settings: {
    pointSystem: Map<string, number>;
    customStats: string[];
    tieBreakers: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  urlSlug: { type: String, unique: true, sparse: true },
  status: {
    type: String,
    enum: ['draft', 'published', 'running', 'completed', 'archived'],
    default: 'draft'
  },
  participants: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
  rounds: [{ type: Schema.Types.ObjectId, ref: 'Round' }],
  settings: {
    pointSystem: { type: Map, of: Number },
    customStats: [String],
    tieBreakers: [String],
  }
}, { timestamps: true }); // Adds createdAt and updatedAt

// This line prevents Mongoose from recompiling the model in Next.js dev mode
const Tournament: Model<ITournament> = models.Tournament || mongoose.model<ITournament>('Tournament', tournamentSchema);

export default Tournament;