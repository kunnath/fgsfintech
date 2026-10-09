/**
 * FGSBot Web Server - Bilingual (DE / EN)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { FGSBotSession } = require('./botLogic.js');
const { calculateFinancialPlan } = require('./financialEngine.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const sessions = new Map();

function getSession(req) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = req.headers['x-session-id'] || urlObj.searchParams.get('session') || 'default';
  const lang = req.headers['x-lang'] || urlObj.searchParams.get('lang') || 'de';
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new FGSBotSession(lang));
  }
  const s = sessions.get(sessionId);
  if (lang) {
    s.setLanguage(lang);
  }
  return s;
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
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID, X-Lang'
  });
  res.end(JSON.stringify(data));
}

function handleApiRequest(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID, X-Lang'
    });
    return res.end();
  }

  const session = getSession(req);

  // GET /api/init
  if (req.method === 'GET' && pathname === '/api/init') {
    try {
      const greeting = session.getGreeting();
      const calculation = session.getCalculatedState();
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
  if (req.method === 'POST' && pathname === '/api/set-language') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const lang = payload.lang === 'en' ? 'en' : 'de';
        session.setLanguage(lang);
        const greeting = session.getGreeting();
        const calculation = session.getCalculatedState();
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
  if (req.method === 'GET' && pathname === '/api/state') {
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
  if (req.method === 'POST' && pathname === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const userMessage = payload.message || '';
        const botResponse = session.processMessage(userMessage);
        const calculation = session.getCalculatedState();
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

  // POST /api/back
  if (req.method === 'POST' && pathname === '/api/back') {
    const botResponse = session.stepBack();
    const calculation = session.getCalculatedState();
    return sendJson(res, 200, {
      response: botResponse,
      calculation,
      currentQuestion: session.getCurrentQuestion(),
      isCompleted: session.isCompleted,
      lang: session.lang
    });
  }

  // POST /api/jump-sheet
  if (req.method === 'POST' && pathname === '/api/jump-sheet') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const sheetNum = payload.sheetNum || 1;
        const botResponse = session.jumpToSheet(sheetNum);
        const calculation = session.getCalculatedState();
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

  // POST /api/set-net-profit-target
  if (req.method === 'POST' && pathname === '/api/set-net-profit-target') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const target = payload.target !== undefined ? payload.target : payload.targetNetProfit;
        const autoScale = payload.autoScale !== false && payload.autoScaleRevenue !== false;
        const botResponse = session.setNetProfitTarget(target, autoScale);
        const calculation = session.getCalculatedState();
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
  if (req.method === 'POST' && pathname === '/api/preset') {
    const botResponse = session.processMessage('preset');
    const calculation = session.getCalculatedState();
    return sendJson(res, 200, {
      response: botResponse,
      calculation,
      currentQuestion: session.getCurrentQuestion(),
      isCompleted: session.isCompleted,
      lang: session.lang
    });
  }

  // POST /api/reset
  if (req.method === 'POST' && pathname === '/api/reset') {
    session.reset();
    const greeting = session.getGreeting();
    const calculation = session.getCalculatedState();
    return sendJson(res, 200, {
      response: greeting,
      calculation,
      currentQuestion: session.getCurrentQuestion(),
      isCompleted: session.isCompleted,
      lang: session.lang
    });
  }

  // POST /api/export-excel
  if (req.method === 'POST' && pathname === '/api/export-excel') {
    const jsonPath = path.join(__dirname, `export_${Date.now()}.json`);
    const exportData = session.customPlanData;
    fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf-8');

    execFile('python3', [path.join(__dirname, 'excelExporter.py'), jsonPath], (error, stdout, stderr) => {
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);

      if (error) {
        return sendJson(res, 500, { error: "Export failed", details: stderr || error.message });
      }
      return sendJson(res, 200, {
        success: true,
        downloadUrl: '/Finanzplanung_FGSBot_Export.xlsx'
      });
    });
    return;
  }

  return sendJson(res, 404, { error: "API endpoint not found" });
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  if (pathname.startsWith('/api/')) {
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
      headers['Content-Disposition'] = 'attachment; filename="Finanzplanung_FGSBot_Export.xlsx"';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`====================================================`);
    console.log(`🤖 FGSBot Financial Planning Server is RUNNING!`);
    console.log(`🌐 Web UI: http://localhost:${port}`);
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
