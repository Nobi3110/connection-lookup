/**
 * Google Apps Script backend for Connection ID / Institution Name lookup.
 * 
 * WITH ADMIN & EMPLOYEE AUTHENTICATION
 *
 * SETUP:
 * 1. Open your Google Sheet (the one AppSheet uses, e.g. "Test Data Sheet").
 * 2. Go to Extensions -> Apps Script.
 * 3. Delete any starter code, paste this whole file in.
 * 4. Update SHEET_NAME / ID_COLUMN / NAME_COLUMN below if your sheet/column
 *    names differ.
 * 5. Create a new sheet called "Users" with columns: username, password, role, status, created
 * 6. Deploy -> Manage deployments -> edit -> Version: New version -> Deploy.
 *    (Or Deploy -> New deployment the first time.)
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the Web app URL -- paste it into API_URL in index.html.
 *
 * ENDPOINTS:
 *   ?suggest=partial-text   -> returns suggestions for dropdown
 *   ?id=exact-connection-id -> returns the single full matching record
 *   ?login=1&username=X&password=Y -> authenticate user
 *   ?action=create_user&username=X&password=Y&role=admin|employee -> create new user (admin only)
 *   ?action=list_users -> get all users (admin only)
 *   ?action=delete_user&username=X -> delete user (admin only)
 */

// ---- CONFIG: change these if your sheet/column names are different ----
var SHEET_NAME = "Audit All Links (English)";
var USERS_SHEET_NAME = "Users";
var ID_COLUMN = "01 Connection ID";
var NAME_COLUMN = "02 Institution / Office Name";
var GEO_COLUMN = "16 Geo Location"; // Column name with coordinates (lat lng format)
var SUGGEST_LIMIT = 15; // max rows returned by the suggest endpoint
var ADMIN_USERNAME = "admin";
var ADMIN_PASSWORD = "#m0t0r0L@$";
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
    // Handle authentication requests
    if (e.parameter.login !== undefined) {
      output = handleLogin_(e.parameter.username || "", e.parameter.password || "");
    } else if (e.parameter.action !== undefined) {
      output = handleAdminAction_(e.parameter);
    } else if (e.parameter.suggest !== undefined) {
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

// ============ AUTHENTICATION FUNCTIONS ============

function getUsersSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
    sheet.appendRow(["username", "password", "role", "status", "created"]);
  }
  ensureAdminUser_(sheet);
  return sheet;
}

function ensureAdminUser_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0 || data[0].length === 0) {
    sheet.appendRow(["username", "password", "role", "status", "created"]);
    data = sheet.getDataRange().getValues();
  }

  var headers = data[0];
  var usernameIdx = headers.indexOf("username");
  var passwordIdx = headers.indexOf("password");
  var roleIdx = headers.indexOf("role");
  var statusIdx = headers.indexOf("status");

  if (usernameIdx === -1 || passwordIdx === -1 || roleIdx === -1 || statusIdx === -1) {
    throw new Error("Users sheet must have username, password, role, and status columns");
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx] || "").trim().toLowerCase() === ADMIN_USERNAME) {
      sheet.getRange(i + 1, passwordIdx + 1).setValue(ADMIN_PASSWORD);
      sheet.getRange(i + 1, roleIdx + 1).setValue("admin");
      sheet.getRange(i + 1, statusIdx + 1).setValue("active");
      return;
    }
  }

  var adminRow = [];
  for (var j = 0; j < headers.length; j++) {
    adminRow.push("");
  }
  adminRow[usernameIdx] = ADMIN_USERNAME;
  adminRow[passwordIdx] = ADMIN_PASSWORD;
  adminRow[roleIdx] = "admin";
  adminRow[statusIdx] = "active";
  if (headers.indexOf("created") !== -1) {
    adminRow[headers.indexOf("created")] = new Date();
  }
  sheet.appendRow(adminRow);
}

function handleLogin_(username, password) {
  var sheet = getUsersSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var usernameIdx = headers.indexOf("username");
  var passwordIdx = headers.indexOf("password");
  var roleIdx = headers.indexOf("role");
  var statusIdx = headers.indexOf("status");
  
  if (usernameIdx === -1 || passwordIdx === -1) {
    return { success: false, error: "Users sheet not configured properly" };
  }
  
  username = String(username).trim().toLowerCase();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var storedUser = String(row[usernameIdx] || "").trim().toLowerCase();
    var storedPass = String(row[passwordIdx] || "").trim();
    var role = String(row[roleIdx] || "employee").trim().toLowerCase();
    var status = String(row[statusIdx] || "active").trim().toLowerCase();
    
    if (storedUser === username && storedPass === password && status === "active") {
      return { 
        success: true, 
        username: username, 
        role: role,
        message: "Login successful"
      };
    }
  }
  
  return { success: false, error: "Invalid username or password" };
}

function handleAdminAction_(params) {
  var action = params.action;
  var username = (params.username || "").toString().trim().toLowerCase();
  var password = (params.password || "").toString().trim();
  var role = (params.role || "employee").toString().trim().toLowerCase();
  var adminUser = (params.adminUser || "").toString().trim().toLowerCase();
  var adminPass = (params.adminPass || "").toString().trim();
  
  // Verify admin credentials
  var loginResult = handleLogin_(adminUser, adminPass);
  if (!loginResult.success || loginResult.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin credentials required." };
  }
  
  var sheet = getUsersSheet_();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  if (action === "create_user") {
    return createUser_(sheet, headers, username, password, role);
  } else if (action === "list_users") {
    return listUsers_(sheet, headers);
  } else if (action === "delete_user") {
    return deleteUser_(sheet, headers, username);
  } else if (action === "update_user") {
    return updateUser_(sheet, headers, username, password, role);
  }
  
  return { success: false, error: "Unknown action" };
}

function createUser_(sheet, headers, username, password, role) {
  if (!username || !password) {
    return { success: false, error: "Username and password required" };
  }
  
  if (role !== "admin" && role !== "employee") {
    return { success: false, error: "Role must be 'admin' or 'employee'" };
  }
  
  var data = sheet.getDataRange().getValues();
  var usernameIdx = headers.indexOf("username");
  
  // Check if user already exists
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx]).trim().toLowerCase() === username) {
      return { success: false, error: "User already exists" };
    }
  }
  
  // Add new user
  sheet.appendRow([username, password, role, "active", new Date()]);
  return { 
    success: true, 
    message: "User '" + username + "' created successfully as " + role 
  };
}

function listUsers_(sheet, headers) {
  var data = sheet.getDataRange().getValues();
  var usernameIdx = headers.indexOf("username");
  var roleIdx = headers.indexOf("role");
  var statusIdx = headers.indexOf("status");
  var createdIdx = headers.indexOf("created");
  
  var users = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][usernameIdx]) {
      users.push({
        username: data[i][usernameIdx],
        role: data[i][roleIdx] || "employee",
        status: data[i][statusIdx] || "active",
        created: data[i][createdIdx]
      });
    }
  }
  
  return { success: true, users: users };
}

function deleteUser_(sheet, headers, username) {
  if (username === "admin") {
    return { success: false, error: "Cannot delete default admin user" };
  }
  
  var data = sheet.getDataRange().getValues();
  var usernameIdx = headers.indexOf("username");
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx]).trim().toLowerCase() === username) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "User '" + username + "' deleted" };
    }
  }
  
  return { success: false, error: "User not found" };
}

function updateUser_(sheet, headers, username, password, role) {
  var data = sheet.getDataRange().getValues();
  var usernameIdx = headers.indexOf("username");
  var passwordIdx = headers.indexOf("password");
  var roleIdx = headers.indexOf("role");
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][usernameIdx]).trim().toLowerCase() === username) {
      if (password) {
        sheet.getRange(i + 1, passwordIdx + 1).setValue(password);
      }
      if (role) {
        sheet.getRange(i + 1, roleIdx + 1).setValue(role);
      }
      return { success: true, message: "User '" + username + "' updated" };
    }
  }
  
  return { success: false, error: "User not found" };
}
