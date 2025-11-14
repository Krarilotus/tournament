import mongoose from "mongoose";

const DB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!DB_URI) {
  throw new Error("Please define the DATABASE_URL (for production) or MONGODB_URI (for development) environment variable");
}

let cached = (global as any).mongoose;
if (!cached) cached = (global as any).mongoose = { conn: null, promise: null };

export default async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(DB_URI!, { bufferCommands: false }).then(m => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}
