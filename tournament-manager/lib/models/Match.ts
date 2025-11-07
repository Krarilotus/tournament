import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IMatch extends Document {
  tournamentId: mongoose.Schema.Types.ObjectId;
  roundId: mongoose.Schema.Types.ObjectId;
  status: 'pending' | 'completed';
  participants: {
    participantId: mongoose.Schema.Types.ObjectId;
    result: string;
    pointsAwarded: number;
    customStats: Map<string, number>;
  }[];
  winner?: mongoose.Schema.Types.ObjectId;
  isDraw: boolean;
}

const matchSchema = new Schema<IMatch>({
  tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  roundId: { type: Schema.Types.ObjectId, ref: 'Round', required: true },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  participants: [{
    participantId: { type: Schema.Types.ObjectId, ref: 'Participant' },
    result: { type: String }, // e.g., 'win', 'loss', '1st'
    pointsAwarded: { type: Number, default: 0 },
    customStats: { type: Map, of: Number }
  }],
  winner: { type: Schema.Types.ObjectId, ref: 'Participant' },
  isDraw: { type: Boolean, default: false }
});

const Match: Model<IMatch> = models.Match || mongoose.model<IMatch>('Match', matchSchema);

export default Match;