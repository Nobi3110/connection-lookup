/**
 * Google Apps Script backend for Connection ID / Institution Name lookup.
 *
 * SETUP:
 * 1. Open your Google Sheet (the one AppSheet uses, e.g. "Test Data Sheet").
 * 2. Go to Extensions -> Apps Script.
 * 3. Delete any starter code, paste this whole file in.
 * 4. Update SHEET_NAME / ID_COLUMN / NAME_COLUMN below if your sheet/column
 *    names differ.
 * 5. Deploy -> Manage deployments -> edit -> Version: New version -> Deploy.
 *    (Or Deploy -> New deployment the first time.)
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web app URL -- paste it into API_URL in index.html.
 *
 * TWO ENDPOINTS (both via doGet, picked by which parameter you send):
 *   ?suggest=partial-text   -> returns a short list of matching
 *                              {id, name} pairs for a dropdown, matching
 *                              against BOTH Connection ID and Institution
 *                              Name.
 *   ?id=exact-connection-id -> returns the single full matching record
 *                              (exact match only).
 */

// ---- CONFIG: change these if your sheet/column names are different ----
var SHEET_NAME = "Audit All Links (English)";
var ID_COLUMN = "01 Connection ID";
var NAME_COLUMN = "02 Institution / Office Name";
var GEO_COLUMN = "16 Geo Location"; // Column name with coordinates (lat lng format)
var SUGGEST_LIMIT = 15; // max rows returned by the suggest endpoint
// -------------------------------------------------------------------

function normalize_(s) {
  return String(s).trim().replace(/\s+/g, " ").toLowerCase();
}

function findColumnIndex_(headers, targetName) {
  var normalizedTarget = normalize_(targetName);
  for (var h = 0; h < headers.length; h++) {
    if (normalize_(headers[h]) === normalizedTarget) {
      return h;
    }
  }
  return -1;
}

function getSheetData_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error("Sheet '" + SHEET_NAME + "' not found");
  }
  return sheet.getDataRange().getValues();
}

function doGet(e) {
  var output;
  try {
    if (e.parameter.suggest !== undefined) {
      output = handleSuggest_(e.parameter.suggest || "");
    } else {
      output = handleExactLookup_(e.parameter.id || "");
    }
  } catch (err) {
    output = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns up to SUGGEST_LIMIT rows whose Connection ID OR Institution Name
 * contains the given text (case-insensitive "contains" match), for
 * populating a dropdown while the user is still typing.
 */
function handleSuggest_(query) {
  var q = normalize_(query);
  if (!q) {
    return { matches: [] };
  }

  var data = getSheetData_();
  var headers = data[0];
  var idColIndex = findColumnIndex_(headers, ID_COLUMN);
  var nameColIndex = findColumnIndex_(headers, NAME_COLUMN);

  if (idColIndex === -1 || nameColIndex === -1) {
    return {
      error: "Column not found. Actual headers: " + headers.join(" | "),
      matches: []
    };
  }

  var matches = [];
  for (var i = 1; i < data.length && matches.length < SUGGEST_LIMIT; i++) {
    var idVal = String(data[i][idColIndex]).trim();
    var nameVal = String(data[i][nameColIndex]).trim();
    if (normalize_(idVal).indexOf(q) !== -1 || normalize_(nameVal).indexOf(q) !== -1) {
      matches.push({ id: idVal, name: nameVal });
    }
  }

  return { matches: matches };
}

/**
 * Returns the single full record whose Connection ID exactly matches
 * (case-insensitive) the given id.
 */
function handleExactLookup_(searchId) {
  searchId = String(searchId).trim();
  if (!searchId) {
    return { found: false, error: "No ID provided" };
  }

  var data = getSheetData_();
  var headers = data[0];
  var idColIndex = findColumnIndex_(headers, ID_COLUMN);

  if (idColIndex === -1) {
    return {
      found: false,
      error: "Column '" + ID_COLUMN + "' not found. Actual headers: " + headers.join(" | ")
    };
  }

  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][idColIndex]).trim();
    if (cellValue.toLowerCase() === searchId.toLowerCase()) {
      var record = {};
      for (var j = 0; j < headers.length; j++) {
        var key = String(headers[j]).trim();
        if (key) {
          record[key] = data[i][j];
        }
      }
      return { found: true, data: record };
    }
  }

  return { found: false };
}
