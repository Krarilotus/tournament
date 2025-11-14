import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing DATABASE_URL (for production) or MONGODB_URI (for development)");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri!);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri!);
  clientPromise = client.connect();
}

export default clientPromise;
