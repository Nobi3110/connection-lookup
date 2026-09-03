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
 *   ?id=exact-connection-id-or-institution-name-or-emis-code -> returns the single full matching record
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
var EMIS_COLUMN = "00 EMIS_CODE";
var GEO_COLUMN = "16 Geo Location"; // Column name with coordinates (lat lng format)
var SUGGEST_LIMIT = 15; // max rows returned by the suggest endpoint
var ADMIN_USERNAME = "admin";
var ADMIN_PASSWORD = "#m0t0r0L@$";
var USERS_PROPERTY_KEY = "EDC_LOOKUP_USERS";
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
 * Returns up to SUGGEST_LIMIT rows whose Connection ID, Institution Name, or EMIS code
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
  var emisColIndex = findColumnIndex_(headers, EMIS_COLUMN);

  if (idColIndex === -1 || nameColIndex === -1 || emisColIndex === -1) {
    return {
      error: "Column not found. Actual headers: " + headers.join(" | "),
      matches: []
    };
  }

  var matches = [];
  for (var i = 1; i < data.length && matches.length < SUGGEST_LIMIT; i++) {
    var idVal = String(data[i][idColIndex]).trim();
    var nameVal = String(data[i][nameColIndex]).trim();
    var emisVal = String(data[i][emisColIndex]).trim();
    if (normalize_(idVal).indexOf(q) !== -1 || normalize_(nameVal).indexOf(q) !== -1 || normalize_(emisVal).indexOf(q) !== -1) {
      matches.push({ id: idVal, name: nameVal, emis: emisVal });
    }
  }

  return { matches: matches };
}

/**
 * Returns the single full record whose Connection ID, Institution Name, or EMIS code exactly matches
 * (case-insensitive) the given value.
 */
function handleExactLookup_(searchId) {
  searchId = String(searchId).trim();
  if (!searchId) {
    return { found: false, error: "No ID provided" };
  }

  var data = getSheetData_();
  var headers = data[0];
  var idColIndex = findColumnIndex_(headers, ID_COLUMN);
  var nameColIndex = findColumnIndex_(headers, NAME_COLUMN);
  var emisColIndex = findColumnIndex_(headers, EMIS_COLUMN);

  if (idColIndex === -1 || nameColIndex === -1 || emisColIndex === -1) {
    return {
      found: false,
      error: "Required search column not found. Actual headers: " + headers.join(" | ")
    };
  }

  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][idColIndex]).trim();
    var nameValue = String(data[i][nameColIndex]).trim();
    var emisValue = String(data[i][emisColIndex]).trim();
    if (cellValue.toLowerCase() === searchId.toLowerCase() || nameValue.toLowerCase() === searchId.toLowerCase() || emisValue.toLowerCase() === searchId.toLowerCase()) {
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

function getUsers_() {
  var properties = PropertiesService.getScriptProperties();
  var storedUsers = properties.getProperty(USERS_PROPERTY_KEY);
  if (storedUsers) {
    return JSON.parse(storedUsers);
  }

  var users = [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    var headers = data[0] || [];
    var usernameIdx = headers.indexOf("username");
    var passwordIdx = headers.indexOf("password");
    var roleIdx = headers.indexOf("role");
    var statusIdx = headers.indexOf("status");
    if (usernameIdx !== -1 && passwordIdx !== -1 && roleIdx !== -1 && statusIdx !== -1) {
      for (var i = 1; i < data.length; i++) {
        if (data[i][usernameIdx]) {
          users.push({
            username: String(data[i][usernameIdx]).trim().toLowerCase(),
            password: String(data[i][passwordIdx] || "").trim(),
            role: String(data[i][roleIdx] || "employee").trim().toLowerCase(),
            status: String(data[i][statusIdx] || "active").trim().toLowerCase(),
            created: data[i][headers.indexOf("created")]
          });
        }
      }
    }
    if (ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
    }
  }

  if (!users.some(function(user) { return user.username === ADMIN_USERNAME; })) {
    users.push({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      role: "admin",
      status: "active",
      created: new Date().toISOString()
    });
  }
  properties.setProperty(USERS_PROPERTY_KEY, JSON.stringify(users));
  return users;
}

function saveUsers_(users) {
  PropertiesService.getScriptProperties().setProperty(USERS_PROPERTY_KEY, JSON.stringify(users));
}

function handleLogin_(username, password) {
  var users = getUsers_();
  username = String(username).trim().toLowerCase();
  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    if (user.username === username && user.password === password && user.status === "active") {
      return { 
        success: true, 
        username: username, 
        role: user.role,
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
  
  if (action === "create_user") {
    return createUser_(username, password, role);
  } else if (action === "list_users") {
    return listUsers_();
  } else if (action === "delete_user") {
    return deleteUser_(username);
  } else if (action === "update_user") {
    return updateUser_(username, password, role);
  }
  
  return { success: false, error: "Unknown action" };
}

function createUser_(username, password, role) {
  if (!username || !password) {
    return { success: false, error: "Username and password required" };
  }
  
  if (role !== "admin" && role !== "employee") {
    return { success: false, error: "Role must be 'admin' or 'employee'" };
  }
  
  var users = getUsers_();
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username) {
      return { success: false, error: "User already exists" };
    }
  }

  users.push({ username: username, password: password, role: role, status: "active", created: new Date().toISOString() });
  saveUsers_(users);
  return { 
    success: true, 
    message: "User '" + username + "' created successfully as " + role 
  };
}

function listUsers_() {
  var users = [];
  var storedUsers = getUsers_();
  for (var i = 0; i < storedUsers.length; i++) {
    if (storedUsers[i].username) {
      users.push({
        username: storedUsers[i].username,
        role: storedUsers[i].role,
        status: storedUsers[i].status,
        created: storedUsers[i].created
      });
    }
  }
  
  return { success: true, users: users };
}

function deleteUser_(username) {
  if (username === "admin") {
    return { success: false, error: "Cannot delete default admin user" };
  }
  
  var users = getUsers_();
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username) {
      users.splice(i, 1);
      saveUsers_(users);
      return { success: true, message: "User '" + username + "' deleted" };
    }
  }
  
  return { success: false, error: "User not found" };
}

function updateUser_(username, password, role) {
  var users = getUsers_();
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username) {
      if (password) {
        users[i].password = password;
      }
      if (role) {
        users[i].role = role;
      }
      saveUsers_(users);
      return { success: true, message: "User '" + username + "' updated" };
    }
  }
  
  return { success: false, error: "User not found" };
}
