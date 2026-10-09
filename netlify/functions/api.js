/**
 * Netlify Serverless Function: ConnectoryFinAssistant API Backend with MongoDB ('zgs') Persistence
 */

const { ConnectoryFinAssistantSession, FGSBotSession } = require('../../botLogic.js');
const { calculateFinancialPlan } = require('../../financialEngine.js');
const { exportPlanToBuffer } = require('../../excelExporter.js');
const { getSessionFromDb, saveSessionToDb, logChatToDb } = require('../../db.js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID, X-Lang',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data)
  };
}

exports.handler = async function (event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    // 1. Resolve Path and Method
    let rawPath = event.path || '';
    // Normalize path from /.netlify/functions/api/... or /api/...
    let path = rawPath.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
    if (!path.startsWith('/')) path = '/' + path;
    if (path === '') path = '/';

    const method = (event.httpMethod || 'GET').toUpperCase();
    const headers = event.headers || {};
    const query = event.queryStringParameters || {};

    const sessionId = headers['x-session-id'] || headers['X-Session-ID'] || query.session || 'default';
    const reqLang = headers['x-lang'] || headers['X-Lang'] || query.lang || 'de';

    // 2. Load / Restore Session from MongoDB
    const session = new ConnectoryFinAssistantSession(reqLang);
    const dbData = await getSessionFromDb(sessionId);
    if (dbData) {
      session.fromJSON(dbData);
    }
    if (reqLang) {
      session.setLanguage(reqLang);
    }

    let parsedBody = {};
    if (event.body) {
      try {
        parsedBody = JSON.parse(event.body);
      } catch (e) {
        parsedBody = {};
      }
    }

    // 3. Route Handling
    // GET /api/init or /init
    if (method === 'GET' && (path === '/init' || path === '/')) {
      const greeting = session.getGreeting();
      const calculation = session.getCalculatedState();
      await saveSessionToDb(sessionId, session.toJSON());

      return jsonResponse(200, {
        greeting,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        lang: session.lang
      });
    }

    // POST /api/set-language
    if (method === 'POST' && path === '/set-language') {
      const lang = parsedBody.lang === 'en' ? 'en' : 'de';
      session.setLanguage(lang);
      const greeting = session.getGreeting();
      const calculation = session.getCalculatedState();
      await saveSessionToDb(sessionId, session.toJSON());

      return jsonResponse(200, {
        success: true,
        lang: session.lang,
        greeting,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted
      });
    }

    // GET /api/state
    if (method === 'GET' && path === '/state') {
      const calculation = session.getCalculatedState();
      return jsonResponse(200, {
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        userAnswers: session.userAnswers,
        lang: session.lang
      });
    }

    // POST /api/chat
    if (method === 'POST' && path === '/chat') {
      const userMessage = parsedBody.message || '';
      const botResponse = session.processMessage(userMessage);
      const calculation = session.getCalculatedState();

      await saveSessionToDb(sessionId, session.toJSON());
      await logChatToDb(sessionId, userMessage, botResponse, calculation.summary);

      return jsonResponse(200, {
        response: botResponse,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        lang: session.lang
      });
    }

    // POST /api/set-net-profit-target
    if (method === 'POST' && path === '/set-net-profit-target') {
      const target = parsedBody.target !== undefined ? parsedBody.target : parsedBody.targetNetProfit;
      const autoScale = parsedBody.autoScale !== false && parsedBody.autoScaleRevenue !== false;
      const botResponse = session.setNetProfitTarget(target, autoScale);
      const calculation = session.getCalculatedState();

      await saveSessionToDb(sessionId, session.toJSON());
      await logChatToDb(sessionId, `[Goal-Seek Target: ${target}]`, botResponse, calculation.summary);

      return jsonResponse(200, {
        response: botResponse,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        lang: session.lang
      });
    }

    // POST /api/back
    if (method === 'POST' && path === '/back') {
      const botResponse = session.stepBack();
      const calculation = session.getCalculatedState();
      await saveSessionToDb(sessionId, session.toJSON());

      return jsonResponse(200, {
        response: botResponse,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        lang: session.lang
      });
    }

    // POST /api/jump-sheet
    if (method === 'POST' && path === '/jump-sheet') {
      const sheetNum = parsedBody.sheetNum || 1;
      const botResponse = session.jumpToSheet(sheetNum);
      const calculation = session.getCalculatedState();
      await saveSessionToDb(sessionId, session.toJSON());

      return jsonResponse(200, {
        response: botResponse,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        lang: session.lang
      });
    }

    // POST /api/preset
    if (method === 'POST' && path === '/preset') {
      const botResponse = session.processMessage('preset');
      const calculation = session.getCalculatedState();
      await saveSessionToDb(sessionId, session.toJSON());

      return jsonResponse(200, {
        response: botResponse,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        lang: session.lang
      });
    }

    // POST /api/reset
    if (method === 'POST' && path === '/reset') {
      session.reset();
      const greeting = session.getGreeting();
      const calculation = session.getCalculatedState();
      await saveSessionToDb(sessionId, session.toJSON());

      return jsonResponse(200, {
        response: greeting,
        calculation,
        currentQuestion: session.getCurrentQuestion(),
        isCompleted: session.isCompleted,
        lang: session.lang
      });
    }

    // POST /api/export-excel
    if ((method === 'POST' || method === 'GET') && path === '/export-excel') {
      try {
        const buffer = await exportPlanToBuffer(session.customPlanData);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="Finanzplanung_ConnectoryFinAssistant_Export.xlsx"',
            'Access-Control-Allow-Origin': '*'
          },
          body: buffer.toString('base64'),
          isBase64Encoded: true
        };
      } catch (exportErr) {
        console.error('Export error:', exportErr);
        return jsonResponse(500, { error: "Export failed", details: exportErr.message });
      }
    }

    return jsonResponse(404, { error: `Endpoint not found: ${method} ${path}` });

  } catch (err) {
    console.error('Handler error:', err);
    return jsonResponse(500, { error: 'Internal Server Error', message: err.message });
  }
};
