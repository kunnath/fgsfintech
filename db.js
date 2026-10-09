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

const crypto = require('crypto');
const inMemoryUsers = new Map();

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

async function registerUser({ name, email, password, businessName = "" }) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');

    const newUser = {
      userId,
      name: name.trim(),
      email: cleanEmail,
      businessName: businessName.trim(),
      passwordHash,
      salt,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    const { db } = await connectToDatabase();
    if (db) {
      const existing = await db.collection('users').findOne({ email: cleanEmail });
      if (existing) {
        return { success: false, error: "Email already registered / E-Mail ist bereits registriert." };
      }
      await db.collection('users').insertOne(newUser);
    } else {
      // In-memory fallback
      if (inMemoryUsers.has(cleanEmail)) {
        return { success: false, error: "Email already registered / E-Mail ist bereits registriert." };
      }
      inMemoryUsers.set(cleanEmail, newUser);
    }

    return {
      success: true,
      user: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        businessName: newUser.businessName,
        createdAt: newUser.createdAt
      }
    };
  } catch (err) {
    console.error(`[MongoDB] Registration error:`, err.message);
    return { success: false, error: err.message };
  }
}

async function authenticateUser(email, password) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    let user = null;

    const { db } = await connectToDatabase();
    if (db) {
      user = await db.collection('users').findOne({ email: cleanEmail });
      if (user) {
        await db.collection('users').updateOne(
          { userId: user.userId },
          { $set: { lastLoginAt: new Date() } }
        );
      }
    } else {
      user = inMemoryUsers.get(cleanEmail);
    }

    if (!user) {
      return { success: false, error: "Invalid email or password / Ungültige E-Mail oder Passwort." };
    }

    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return { success: false, error: "Invalid email or password / Ungültige E-Mail oder Passwort." };
    }

    return {
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        businessName: user.businessName || "",
        createdAt: user.createdAt
      }
    };
  } catch (err) {
    console.error(`[MongoDB] Login error:`, err.message);
    return { success: false, error: err.message };
  }
}

async function getUserById(userId) {
  try {
    const { db } = await connectToDatabase();
    if (db) {
      const user = await db.collection('users').findOne({ userId });
      if (user) {
        return {
          userId: user.userId,
          name: user.name,
          email: user.email,
          businessName: user.businessName || "",
          createdAt: user.createdAt
        };
      }
    }
    
    for (const u of inMemoryUsers.values()) {
      if (u.userId === userId) {
        return {
          userId: u.userId,
          name: u.name,
          email: u.email,
          businessName: u.businessName || "",
          createdAt: u.createdAt
        };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  connectToDatabase,
  getSessionFromDb,
  saveSessionToDb,
  logChatToDb,
  registerUser,
  authenticateUser,
  getUserById,
  DB_NAME
};
