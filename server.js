/**
 * ConnectoryFinAssistant Web Server - Bilingual (DE / EN) with MongoDB ('zgs') Persistence
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ConnectoryFinAssistantSession, FGSBotSession } = require('./botLogic.js');
const { calculateFinancialPlan } = require('./financialEngine.js');
const { exportPlanToBuffer, exportPlanToFile } = require('./excelExporter.js');
const { connectToDatabase, getSessionFromDb, saveSessionToDb, logChatToDb, registerUser, authenticateUser, getUserById, DB_NAME } = require('./db.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const inMemorySessions = new Map();

async function getSession(req) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = req.headers['x-session-id'] || urlObj.searchParams.get('session') || 'default';
  const lang = req.headers['x-lang'] || urlObj.searchParams.get('lang') || 'de';

  if (!inMemorySessions.has(sessionId)) {
    const session = new ConnectoryFinAssistantSession(lang);
    // Attempt to restore from MongoDB
    const dbData = await getSessionFromDb(sessionId);
    if (dbData) {
      session.fromJSON(dbData);
    }
    inMemorySessions.set(sessionId, session);
  }

  const s = inMemorySessions.get(sessionId);
  if (lang) {
    s.setLanguage(lang);
  }
  return { session: s, sessionId };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID, X-Lang, X-User-ID, Authorization, x-user-id, x-session-id, x-lang, *',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

async function handleApiRequest(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID, X-Lang, X-User-ID, Authorization, x-user-id, x-session-id, x-lang, *'
    });
    return res.end();
  }

  let cleanPath = (pathname || '').replace(/\/+$/, '') || '/';
  if (!cleanPath.startsWith('/api')) {
    cleanPath = '/api' + cleanPath;
  }

  // POST /api/auth/register or /auth/register
  if (req.method === 'POST' && (cleanPath === '/api/auth/register' || cleanPath === '/api/register')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { name, email, password, businessName } = JSON.parse(body || '{}');
        if (!name || !email || !password) {
          return sendJson(res, 400, { success: false, error: "Name, email and password are required / Name, E-Mail und Passwort sind erforderlich." });
        }
        if (password.length < 6) {
          return sendJson(res, 400, { success: false, error: "Password must be at least 6 characters / Passwort muss mindestens 6 Zeichen lang sein." });
        }

        const result = await registerUser({ name, email, password, businessName });
        if (!result.success) {
          return sendJson(res, 400, result);
        }

        // Initialize user-linked session
        if (businessName) {
          session.customPlanData.umsatzplanung.geschaeftsfeld_1_name = businessName;
        }
        await saveSessionToDb(sessionId, session.toJSON());

        return sendJson(res, 201, {
          success: true,
          user: result.user,
          sessionId
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // POST /api/auth/login or /auth/login
  if (req.method === 'POST' && (cleanPath === '/api/auth/login' || cleanPath === '/api/login')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body || '{}');
        if (!email || !password) {
          return sendJson(res, 400, { success: false, error: "Email and password are required / E-Mail und Passwort sind erforderlich." });
        }

        const result = await authenticateUser(email, password);
        if (!result.success) {
          return sendJson(res, 401, result);
        }

        return sendJson(res, 200, {
          success: true,
          user: result.user,
          sessionId
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // GET /api/auth/me or /auth/me
  if (req.method === 'GET' && (cleanPath === '/api/auth/me' || cleanPath === '/api/me')) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return sendJson(res, 200, { authenticated: false, user: null });
    }
    const user = await getUserById(userId);
    return sendJson(res, 200, { authenticated: !!user, user });
  }

  // POST /api/auth/logout or /auth/logout
  if (req.method === 'POST' && (cleanPath === '/api/auth/logout' || cleanPath === '/api/logout')) {
    return sendJson(res, 200, { success: true, message: "Logged out successfully" });
  }

  // Enforce Authentication for all financial planning endpoints
  const authUserId = req.headers['x-user-id'];
  if (!authUserId) {
    return sendJson(res, 401, {
      success: false,
      error: "Authentication required. Please sign in or register / Anmeldung erforderlich.",
      requireAuth: true
    });
  }

  // GET /api/init or /init
  if (req.method === 'GET' && (cleanPath === '/api/init' || cleanPath === '/api/')) {
    try {
      const greeting = session.getGreeting();
      const calculation = session.getCalculatedState();
      await saveSessionToDb(sessionId, session.toJSON());

      return sendJson(res, 200, {
        greeting,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        lang: session.lang
      });
    } catch (err) {
      console.error("Init error:", err);
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/set-language
  if (req.method === 'POST' && cleanPath === '/api/set-language') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const lang = payload.lang === 'en' ? 'en' : 'de';
        session.setLanguage(lang);
        const greeting = session.getGreeting();
        const calculation = session.getCalculatedState();
        await saveSessionToDb(sessionId, session.toJSON());

        return sendJson(res, 200, {
          success: true,
          lang: session.lang,
          greeting,
          calculation,
          currentQuestion: session.getCurrentQuestion(),
          isCompleted: session.isCompleted
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    });
    return;
  }

  // GET /api/state
  if (req.method === 'GET' && cleanPath === '/api/state') {
    const calculation = session.getCalculatedState();
    return sendJson(res, 200, {
      calculation,
      currentQuestion: session.getCurrentQuestion(),
      isCompleted: session.isCompleted,
      userAnswers: session.userAnswers,
      lang: session.lang
    });
  }

  // POST /api/chat
  if (req.method === 'POST' && cleanPath === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const userMessage = payload.message || '';
        const botResponse = session.processMessage(userMessage);
        const calculation = session.getCalculatedState();

        await saveSessionToDb(sessionId, session.toJSON());
        await logChatToDb(sessionId, userMessage, botResponse, calculation.summary);

        return sendJson(res, 200, {
          response: botResponse,
          calculation,
          currentQuestion: session.getCurrentQuestion(),
          isCompleted: session.isCompleted,
          lang: session.lang
        });
      } catch (err) {
        return sendJson(res, 400, { error: "Invalid JSON", details: err.message });
      }
    });
    return;
  }

  // POST /api/set-net-profit-target
  if (req.method === 'POST' && cleanPath === '/api/set-net-profit-target') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const target = payload.target !== undefined ? payload.target : payload.targetNetProfit;
        const autoScale = payload.autoScale !== false && payload.autoScaleRevenue !== false;
        const botResponse = session.setNetProfitTarget(target, autoScale);
        const calculation = session.getCalculatedState();

        await saveSessionToDb(sessionId, session.toJSON());
        await logChatToDb(sessionId, `[Goal-Seek: ${target}]`, botResponse, calculation.summary);

        return sendJson(res, 200, {
          response: botResponse,
          calculation,
          currentQuestion: session.getCurrentQuestion(),
          isCompleted: session.isCompleted,
          lang: session.lang
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    });
    return;
  }

  // POST /api/back
  if (req.method === 'POST' && cleanPath === '/api/back') {
    const botResponse = session.stepBack();
    const calculation = session.getCalculatedState();
    await saveSessionToDb(sessionId, session.toJSON());

    return sendJson(res, 200, {
      response: botResponse,
      calculation,
      currentQuestion: session.getCurrentQuestion(),
      isCompleted: session.isCompleted,
      lang: session.lang
    });
  }

  // POST /api/jump-sheet
  if (req.method === 'POST' && cleanPath === '/api/jump-sheet') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const sheetNum = payload.sheetNum || 1;
        const botResponse = session.jumpToSheet(sheetNum);
        const calculation = session.getCalculatedState();
        await saveSessionToDb(sessionId, session.toJSON());

        return sendJson(res, 200, {
          response: botResponse,
          calculation,
          currentQuestion: session.getCurrentQuestion(),
          isCompleted: session.isCompleted,
          lang: session.lang
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    });
    return;
  }

  // POST /api/preset
  if (req.method === 'POST' && cleanPath === '/api/preset') {
    const botResponse = session.processMessage('preset');
    const calculation = session.getCalculatedState();
    await saveSessionToDb(sessionId, session.toJSON());

    return sendJson(res, 200, {
      response: botResponse,
      calculation,
      currentQuestion: session.getCurrentQuestion(),
      isCompleted: session.isCompleted,
      lang: session.lang
    });
  }

  // POST /api/reset
  if (req.method === 'POST' && cleanPath === '/api/reset') {
    session.reset();
    const greeting = session.getGreeting();
    const calculation = session.getCalculatedState();
    await saveSessionToDb(sessionId, session.toJSON());

    return sendJson(res, 200, {
      response: greeting,
      calculation,
      currentQuestion: session.getCurrentQuestion(),
      isCompleted: session.isCompleted,
      lang: session.lang
    });
  }

  // POST or GET /api/export-excel
  if (cleanPath === '/api/export-excel') {
    try {
      const buffer = await exportPlanToBuffer(session.customPlanData);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Finanzplanung_ConnectoryFinAssistant_Export.xlsx"',
        'Content-Length': buffer.length,
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(buffer);
    } catch (exportErr) {
      console.error('Export error:', exportErr);
      return sendJson(res, 500, { error: "Export failed", details: exportErr.message });
    }
  }

  return sendJson(res, 404, { error: "API endpoint not found" });
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  if (req.method === 'OPTIONS' || pathname.startsWith('/api') || pathname.startsWith('/auth')) {
    return handleApiRequest(req, res, pathname);
  }

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('File not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
    if (ext === '.xlsx') {
      headers['Content-Disposition'] = 'attachment; filename="Finanzplanung_ConnectoryFinAssistant_Export.xlsx"';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

async function startServer(port) {
  // Initialize MongoDB connection
  await connectToDatabase();

  server.listen(port, () => {
    console.log(`====================================================`);
    console.log(`🤖 ConnectoryFinAssistant Server is RUNNING!`);
    console.log(`🌐 Web UI: http://localhost:${port}`);
    console.log(`🍃 Database: MongoDB ('${DB_NAME}')`);
    console.log(`🌍 Languages: 🇩🇪 Deutsch | 🇬🇧 English`);
    console.log(`📊 Benchmark: 100k NettoProfit (PrimeDiet Care Modell)`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(Number(PORT));
