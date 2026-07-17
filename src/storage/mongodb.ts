/**
 * MongoDB storage adapter — used when MONGODB_URI is set (Vercel production).
 * Falls back to filesystem storage for local development.
 */
import { MongoClient, type Db } from "mongodb";

import type { ExamFile, ResultRow } from "@/shared/types";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidToken(token: string): boolean {
  return typeof token === "string" && UUID_V4.test(token);
}

// In Vercel serverless, module-level variables reset on cold starts.
// Cache the client on globalThis so it survives across invocations.
const globalForMongo = globalThis as unknown as {
  _mongoClient: MongoClient | null;
  _mongoDb: Db | null;
};

if (!globalForMongo._mongoClient) {
  globalForMongo._mongoClient = null;
}
if (!globalForMongo._mongoDb) {
  globalForMongo._mongoDb = null;
}

async function getDb(): Promise<Db> {
  if (globalForMongo._mongoDb) return globalForMongo._mongoDb;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  const client = new MongoClient(uri, {
    // Serverless-friendly options
    maxPoolSize: 5,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
    // Ensure TLS works in serverless environments
    tls: true,
    tlsAllowInvalidCertificates: false,
  });
  await client.connect();
  globalForMongo._mongoClient = client;
  globalForMongo._mongoDb = client.db("exam-platform");
  return globalForMongo._mongoDb;
}

export async function examExists(token: string): Promise<boolean> {
  if (!isValidToken(token)) return false;
  const db = await getDb();
  const count = await db.collection("exams").countDocuments({ token }, { limit: 1 });
  return count > 0;
}

export async function createExam(exam: ExamFile): Promise<void> {
  if (await examExists(exam.token)) {
    throw new Error(`exam already exists: ${exam.token}`);
  }
  const db = await getDb();
  await db.collection("exams").insertOne(exam);
}

export async function loadExam(token: string): Promise<ExamFile | null> {
  if (!isValidToken(token)) return null;
  const db = await getDb();
  const doc = await db.collection("exams").findOne({ token });
  if (!doc) return null;
  // Remove MongoDB _id field
  const { _id, ...rest } = doc as ExamFile & { _id: unknown };
  return rest;
}

export async function saveExam(exam: ExamFile): Promise<void> {
  const db = await getDb();
  await db.collection("exams").updateOne(
    { token: exam.token },
    { $set: exam },
    { upsert: true }
  );
}

export async function appendResult(row: ResultRow): Promise<void> {
  const db = await getDb();
  await db.collection("results").insertOne(row);
}
