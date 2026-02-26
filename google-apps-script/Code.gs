/**
 * Draw in the Air — Google Apps Script Web App
 * 
 * Provides two endpoints:
 *   POST /exec  — Append rows to Sessions or Events tabs
 *   GET  /exec  — Return aggregated summary JSON (PIN-protected)
 *
 * Setup:
 *   1. Create a Google Sheet with two tabs: "Sessions" and "Events"
 *   2. Open Extensions → Apps Script
 *   3. Paste this code
 *   4. Set ADMIN_PIN in Script Properties (Project Settings → Script Properties)
 *   5. Deploy → New Deployment → Web App → Execute as Me → Anyone can access
 *   6. Copy the deployment URL → set as VITE_SHEETS_ENDPOINT in .env
 */

// ─── Configuration ──────────────────────────────────────────────
function getSheet(tabName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
}

function getAdminPin() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || 'changeme';
}

// ─── POST handler — append rows ─────────────────────────────────
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var type = body.type; // "session" | "event" | "events"
    var payload = body.payload;

    if (type === 'session') {
      appendSession(payload);
    } else if (type === 'event') {
      appendEvent(payload);
    } else if (type === 'events') {
      // Batch: payload is an array of events
      for (var i = 0; i < payload.length; i++) {
        appendEvent(payload[i]);
      }
    } else {
      return jsonResponse({ error: 'Unknown type: ' + type }, 400);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function appendSession(s) {
  var sheet = getSheet('Sessions');
  if (!sheet) throw new Error('Sessions tab not found');
  sheet.appendRow([
    s.sessionId       || '',
    s.startedAt       || '',
    s.endedAt         || '',
    s.durationMs      || 0,
    s.ageBand         || '',
    s.schoolId        || '',
    s.classId         || '',
    s.deviceType      || '',
    s.buildVersion    || '',
    s.gamesPlayedCount     || 0,
    s.totalStagesCompleted || 0,
    s.totalCorrect    || 0,
    s.totalWrong      || 0
  ]);
  // Force ageBand (column 5) to plain text — Google Sheets interprets
  // "4-5" as "April 5th" date otherwise.
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 5).setNumberFormat('@');
}

function appendEvent(ev) {
  var sheet = getSheet('Events');
  if (!sheet) throw new Error('Events tab not found');
  sheet.appendRow([
    ev.eventId        || '',
    ev.sessionId      || '',
    ev.timestamp      || '',
    ev.eventType      || '',
    ev.gameId         || '',
    ev.stageId        || '',
    ev.itemKey        || '',
    ev.itemInstanceId || '',
    ev.binId          || '',
    ev.isCorrect !== undefined ? ev.isCorrect : '',
    ev.elapsedMs      || 0,
    ev.metaJson       || ''
  ]);
}

// ─── GET handler — summary endpoint AND data ingestion ──────────
//
// Google Apps Script 302-redirects POST requests, which causes browsers
// to drop the body. To work around this, data ingestion also uses GET
// with the payload encoded as a ?data= query parameter.
//
//   GET ?pin=XXX          → return aggregated summary JSON
//   GET ?data=URL_ENCODED → ingest session/event data (same format as old POST)
//
function doGet(e) {
  var params = e.parameter || {};
  
  // ── Data ingestion path ──
  if (params.data) {
    try {
      var body = JSON.parse(params.data);
      var type = body.type;
      var payload = body.payload;
      
      if (type === 'session') {
        appendSession(payload);
      } else if (type === 'event') {
        appendEvent(payload);
      } else if (type === 'events') {
        for (var i = 0; i < payload.length; i++) {
          appendEvent(payload[i]);
        }
      } else {
        return jsonResponse({ error: 'Unknown type: ' + type }, 400);
      }
      
      return jsonResponse({ ok: true });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
  
  // ── Summary read path ──
  var pin = params.pin || '';
  if (pin !== getAdminPin()) {
    return jsonResponse({ error: 'Unauthorized' }, 403);
  }

  try {
    var summary = buildSummary();
    return jsonResponse(summary);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function buildSummary() {
  var sessionsSheet = getSheet('Sessions');
  var eventsSheet = getSheet('Events');

  // ── Sessions data ──
  var sessionsData = sessionsSheet ? sessionsSheet.getDataRange().getValues() : [];
  var sessionRows = sessionsData.slice(1); // skip header

  var totalSessions = sessionRows.length;
  var totalPlaytimeMs = 0;
  var totalCorrect = 0;
  var totalWrong = 0;
  var totalStages = 0;
  var sessionsByAgeBand = {};
  var recentSessions = [];

  for (var i = 0; i < sessionRows.length; i++) {
    var row = sessionRows[i];
    // Columns: sessionId(0), startedAt(1), endedAt(2), durationMs(3), ageBand(4),
    //          schoolId(5), classId(6), deviceType(7), buildVersion(8),
    //          gamesPlayedCount(9), totalStagesCompleted(10), totalCorrect(11), totalWrong(12)
    var durationMs = Number(row[3]) || 0;
    var ageBand = String(row[4]) || 'unknown';
    var correct = Number(row[11]) || 0;
    var wrong = Number(row[12]) || 0;
    var stages = Number(row[10]) || 0;

    totalPlaytimeMs += durationMs;
    totalCorrect += correct;
    totalWrong += wrong;
    totalStages += stages;

    sessionsByAgeBand[ageBand] = (sessionsByAgeBand[ageBand] || 0) + 1;

    // Collect recent sessions (last 50)
    if (i >= sessionRows.length - 50) {
      recentSessions.push({
        startedAt: row[1],
        ageBand: ageBand,
        gamesPlayed: Number(row[9]) || 0,
        durationMs: durationMs,
        accuracy: (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0,
        stagesCompleted: stages
      });
    }
  }

  // ── Events data ──
  var eventsData = eventsSheet ? eventsSheet.getDataRange().getValues() : [];
  var eventRows = eventsData.slice(1);

  var sessionsByGame = {};
  var accuracyByStage = {};
  var timeByStage = {};
  var failedItems = {};
  var correctCount = 0;
  var wrongCount = 0;

  for (var j = 0; j < eventRows.length; j++) {
    var ev = eventRows[j];
    // Columns: eventId(0), sessionId(1), timestamp(2), eventType(3), gameId(4),
    //          stageId(5), itemKey(6), itemInstanceId(7), binId(8), isCorrect(9),
    //          elapsedMs(10), metaJson(11)
    var eventType = String(ev[3]);
    var gameId = String(ev[4]);
    var stageId = String(ev[5]);
    var isCorrect = ev[9];
    var elapsed = Number(ev[10]) || 0;
    var itemKey = String(ev[6]);

    // Sessions by game (count game_selected events)
    if (eventType === 'game_selected' && gameId) {
      sessionsByGame[gameId] = (sessionsByGame[gameId] || 0) + 1;
    }

    // Accuracy by stage (from item_dropped with isCorrect)
    if (eventType === 'item_dropped' && stageId) {
      if (!accuracyByStage[stageId]) {
        accuracyByStage[stageId] = { correct: 0, wrong: 0 };
      }
      if (isCorrect === true || isCorrect === 'TRUE' || isCorrect === 1) {
        accuracyByStage[stageId].correct++;
        correctCount++;
      } else if (isCorrect === false || isCorrect === 'FALSE' || isCorrect === 0) {
        accuracyByStage[stageId].wrong++;
        wrongCount++;
      }
    }

    // Time by stage (from stage_completed)
    if (eventType === 'stage_completed' && stageId && elapsed > 0) {
      if (!timeByStage[stageId]) {
        timeByStage[stageId] = { totalMs: 0, count: 0 };
      }
      timeByStage[stageId].totalMs += elapsed;
      timeByStage[stageId].count++;
    }

    // Most failed items
    if (eventType === 'item_dropped' && (isCorrect === false || isCorrect === 'FALSE' || isCorrect === 0) && itemKey) {
      failedItems[itemKey] = (failedItems[itemKey] || 0) + 1;
    }
  }

  // Compute avg time per stage
  var avgTimeByStage = {};
  for (var stage in timeByStage) {
    avgTimeByStage[stage] = Math.round(timeByStage[stage].totalMs / timeByStage[stage].count);
  }

  // Compute accuracy percentages by stage
  var accuracyPctByStage = {};
  for (var s in accuracyByStage) {
    var total = accuracyByStage[s].correct + accuracyByStage[s].wrong;
    accuracyPctByStage[s] = total > 0 ? Math.round((accuracyByStage[s].correct / total) * 100) : 0;
  }

  // Sort failed items by count descending, take top 10
  var failedItemsSorted = Object.keys(failedItems).map(function(k) {
    return { item: k, count: failedItems[k] };
  }).sort(function(a, b) { return b.count - a.count; }).slice(0, 10);

  var totalAttempts = totalCorrect + totalWrong;
  var avgAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  var avgSessionDurationMs = totalSessions > 0 ? Math.round(totalPlaytimeMs / totalSessions) : 0;

  return {
    kpi: {
      totalSessions: totalSessions,
      totalPlaytimeMs: totalPlaytimeMs,
      avgSessionDurationMs: avgSessionDurationMs,
      avgAccuracy: avgAccuracy,
      totalStagesCompleted: totalStages
    },
    breakdowns: {
      sessionsByAgeBand: sessionsByAgeBand,
      sessionsByGame: sessionsByGame,
      accuracyByStage: accuracyPctByStage,
      avgTimeByStage: avgTimeByStage,
      mostFailedItems: failedItemsSorted,
      dropOutcomes: {
        correct: correctCount,
        wrong: wrongCount
      }
    },
    recentSessions: recentSessions.reverse()
  };
}

// ─── Helpers ────────────────────────────────────────────────────
function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
