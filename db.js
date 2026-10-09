/**
 * MongoDB connection and session persistence for database 'zgs'
 */
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://kunnathsreelesh_db_user:GGgde9EKJwBl59GH@cluster0.9gysv6t.mongodb.net/zgs?retryWrites=true&w=majority";
const DB_NAME = "zgs";

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    await client.connect();
    const db = client.db(DB_NAME);
    cachedClient = client;
    cachedDb = db;
    return { client, db };
  } catch (err) {
    console.error(`[MongoDB] Connection failed:`, err.message);
    return { client: null, db: null, error: err };
  }
}

async function getSessionFromDb(sessionId) {
  try {
    const { db } = await connectToDatabase();
    if (!db) return null;
    const doc = await db.collection('sessions').findOne({ sessionId });
    return doc ? doc.data : null;
  } catch (err) {
    console.error(`[MongoDB] Error reading session ${sessionId}:`, err.message);
    return null;
  }
}

async function saveSessionToDb(sessionId, sessionData) {
  try {
    const { db } = await connectToDatabase();
    if (!db) return false;
    await db.collection('sessions').updateOne(
      { sessionId },
      {
        $set: {
          sessionId,
          data: sessionData,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.error(`[MongoDB] Error saving session ${sessionId}:`, err.message);
    return false;
  }
}

async function logChatToDb(sessionId, userMessage, botResponse, calculationSummary) {
  try {
    const { db } = await connectToDatabase();
    if (!db) return;
    await db.collection('chat_logs').insertOne({
      sessionId,
      userMessage,
      botResponse: typeof botResponse === 'string' ? botResponse : botResponse?.text,
      calculationSummary,
      timestamp: new Date()
    });
  } catch (err) {
    console.error(`[MongoDB] Error logging chat:`, err.message);
  }
}

module.exports = {
  connectToDatabase,
  getSessionFromDb,
  saveSessionToDb,
  logChatToDb,
  DB_NAME
};
