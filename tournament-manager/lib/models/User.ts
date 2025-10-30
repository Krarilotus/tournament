import mongoose, { Schema, Document, Model, models } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name?: string;
  email: string;
  password?: string;
  emailVerified?: Date | null;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String },
    emailVerified: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre<IUser>("save", async function (next) {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

const User: Model<IUser> = models.User || mongoose.model<IUser>("User", userSchema);
export default User;
