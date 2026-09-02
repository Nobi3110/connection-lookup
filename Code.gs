/**
 * Google Apps Script backend for Connection ID lookup.
 * 
 * SETUP:
 * 1. Open your Google Sheet (the one AppSheet uses, e.g. "Test Data Sheet").
 * 2. Go to Extensions -> Apps Script.
 * 3. Delete any starter code, paste this whole file in.
 * 4. Update SHEET_NAME and ID_COLUMN below if your sheet/column names differ.
 * 5. Click Deploy -> New deployment -> type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web app URL it gives you -- paste it into API_URL in index.html.
 */

// ---- CONFIG: change these if your sheet/column names are different ----
var SHEET_NAME = "Audit All Links (English)";
var ID_COLUMN = "01 Connection ID";
// -------------------------------------------------------------------

function doGet(e) {
  var output;
  try {
    var searchId = (e.parameter.id || "").trim();

    if (!searchId) {
      output = { found: false, error: "No ID provided" };
    } else {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sheet) {
        output = { found: false, error: "Sheet '" + SHEET_NAME + "' not found" };
      } else {
        var data = sheet.getDataRange().getValues();
        var headers = data[0];

        // Normalize headers for matching: trim whitespace, collapse
        // multiple spaces, lowercase. This avoids failures from small
        // formatting differences (extra spaces, different case, etc.)
        function normalize(s) {
          return String(s).trim().replace(/\s+/g, " ").toLowerCase();
        }
        var normalizedTarget = normalize(ID_COLUMN);
        var idColIndex = -1;
        for (var h = 0; h < headers.length; h++) {
          if (normalize(headers[h]) === normalizedTarget) {
            idColIndex = h;
            break;
          }
        }

        if (idColIndex === -1) {
          output = {
            found: false,
            error: "Column '" + ID_COLUMN + "' not found. Actual headers: " + headers.join(" | ")
          };
        } else {
          output = { found: false };
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
              output = { found: true, data: record };
              break; // exact match only, stop at first hit
            }
          }
        }
      }
    }
  } catch (err) {
    output = { found: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
