import { MongoClient, type Db } from "mongodb";

/**
 * MongoDB connection module — singleton client, lazy-connected.
 * MONGODB_URI must be set in .env (MongoDB Atlas or local).
 */

const DB_NAME = "exam-platform";

let _client: MongoClient | null = null;
let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (_db) return _db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI must be set in environment variables");
  }

  _client = new MongoClient(uri);
  await _client.connect();
  _db = _client.db(DB_NAME);

  // Ensure indexes
  await _db.collection("exams").createIndex({ token: 1 }, { unique: true });
  await _db.collection("results").createIndex({ submittedAt: -1 });
  await _db.collection("examDrafts").createIndex({ createdAt: -1 });

  console.log(`[MongoDB] Connected to ${DB_NAME}`);
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _db = null;
  }
}
