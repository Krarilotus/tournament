import mongoose, { Schema, Document, Model, models } from "mongoose";

export interface IEmailToken extends Document {
  identifier: string; // email
  token: string;
  expires: Date;
}

const emailTokenSchema = new Schema<IEmailToken>(
  {
    identifier: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    expires: { type: Date, required: true },
  },
  { timestamps: true }
);

const EmailToken: Model<IEmailToken> =
  models.EmailToken || mongoose.model<IEmailToken>("EmailToken", emailTokenSchema);

export default EmailToken;
