import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IRound extends Document {
  tournamentId: mongoose.Schema.Types.ObjectId;
  roundNumber: number;
  system: string; // e.g., "swiss-1v1"
  status: 'pending' | 'running' | 'completed';
  matches: mongoose.Schema.Types.ObjectId[];
}

const roundSchema = new Schema<IRound>({
  tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  roundNumber: { type: Number, required: true },
  system: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed'],
    default: 'pending'
  },
  matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }]
});

const Round: Model<IRound> = models.Round || mongoose.model<IRound>('Round', roundSchema);

export default Round;