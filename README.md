# EDC Lookup

A lightweight Google Apps Script and HTML project that searches a Google Sheet by Connection ID, Institution Name, or EMIS code and returns the matching record. **Now with admin authentication and employee user management!**

## Overview

This project is designed for quick record lookup from a spreadsheet using unique identifiers such as Connection ID, Institution Name, or EMIS_CODE. It features an interactive autocomplete dropdown that provides suggestions as you type, and now includes a complete authentication system for admins and employees.

### Key Components:

- `auth.html` — Login portal for admins and employees
- `index.html` — Main application with search and admin dashboard
- `Code.gs` — Google Apps Script backend with authentication and data endpoints
- `README.md` — This documentation file

## Features

- **Autocomplete Dropdown**: Real-time suggestions as you type
- **Multi-field Search**: Search by Connection ID, Institution Name, or EMIS_CODE
- **Partial Matching**: Dropdown suggestions use "contains" matching for flexible searching
- **Exact Lookup**: Get complete matching records with exact Connection ID, Institution Name, or EMIS code search
- **Geo Location Mapping**: Click the 📍 map icon to view locations in Google Maps
- **Directions**: Get directions to any mapped location directly from results
- **Embedded Map Preview**: View locations on an embedded map below results
- **Authentication**: Secure login for admins and employees
- **Admin Panel**: Create and manage employee accounts
- **Role-based Access**: Different permissions for admins and employees
- **Case-insensitive Matching**: Works with any character case
- **Full Record Display**: Returns and displays the entire matching row as JSON
- **Clean UI**: Professional browser interface with responsive design
- **Google Sheets Backend**: Uses Google Sheets as the data source
- **Easy Deployment**: Simple setup as a Google Apps Script web app

## Project Structure

```text
First App/
├── auth.html          # Login page
├── index.html         # Main app with search and admin panel
├── Code.gs            # Google Apps Script backend
├── README.md          # This file
└── Google Apps Script deployment (connected to Google Sheet)
```

## Requirements

- A Google account
- A Google Sheet containing the lookup data
- A header row with `00 EMIS_CODE`, `01 Connection ID`, and `02 Institution / Office Name` columns
- Access to Google Apps Script
- Apps Script storage for portal credentials (no Users sheet required)

## Setup Instructions

### 1. Prepare the Data Sheet

Make sure your spreadsheet contains:

- A sheet with your connection data
- A header row with the `00 EMIS_CODE`, `01 Connection ID`, and `02 Institution / Office Name` fields
- Values that match the codes, IDs, or institution names you want to search

Example configuration:

- Sheet name: `Audit All Links (English)`
- Column names: `00 EMIS_CODE`, `01 Connection ID`, `02 Institution / Office Name`, etc.

### 2. Configure the Admin Account

No `Users` sheet is required. User accounts are stored privately in Apps Script Properties. The default admin credentials are configured in `Code.gs`:
- **Username**: `admin`
- **Password**: the value of `ADMIN_PASSWORD`

⚠️ **IMPORTANT**: Change the default admin password after first login!

The app automatically hides the `Users` sheet so employee users do not see portal account details in the normal spreadsheet view. Hidden sheets are not a security boundary for people with Editor access; for stronger protection, keep the spreadsheet restricted to administrators and give employees access only to the web app.

### 3. Update the Apps Script settings

Open `Code.gs` and verify these configuration lines:

```javascript
var SHEET_NAME = "Audit All Links (English)";
var USERS_SHEET_NAME = "Users";
var EMIS_COLUMN = "00 EMIS_CODE";
var ID_COLUMN = "01 Connection ID";
var NAME_COLUMN = "02 Institution / Office Name";
var GEO_COLUMN = "16 Geo Location"; // Column with coordinates (lat lng format)
var SUGGEST_LIMIT = 15; // max rows returned by suggest endpoint
```

If your sheet name, column names, or desired suggest limit differs, update them to match your spreadsheet.

### 4. Deploy the Apps Script as a web app

In Google Apps Script:

1. Open your Apps Script project
2. Click `Deploy` → `New deployment`
3. Choose `Web app`
4. Set:
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`
5. Click `Deploy`
6. Copy the generated web app URL

When you change `Code.gs`, use **Deploy** -> **Manage deployments** -> **Edit** -> **New version** -> **Deploy**. The web app URL usually remains the same.

### 5. Update both HTML files with the API URL

Open both `auth.html` and `index.html` and find this line:

```javascript
const API_URL = "https://script.google.com/macros/s/AKfycbzOIOKp0Q2OKG1h6N6cp3RdEIlrkhubHDoqMT_4Cqb1PY4WxYuaRUFVr0DYrpvAMTVt/exec";
```

Replace it with your actual Apps Script URL:

```javascript
const API_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

## Authentication & User Management

### Logging In

1. Open `auth.html` in your browser
2. Enter your username and password
3. Click "Login"
4. On successful login, you'll be redirected to the main app
5. Use the search features or access the Admin Panel (if admin)

### Default Admin Credentials

```
Username: admin
Password: the value of ADMIN_PASSWORD in Code.gs
```

⚠️ **Change these immediately after first login for security!**

### Admin Panel Features

#### Access the Admin Panel

1. Log in with an admin account
2. Click the "⚙️ Admin Panel" tab
3. You'll see options to create and manage employees

#### Create Employee Accounts

1. Go to "Admin Panel" tab
2. Fill in the "Create New Employee" form:
   - **Username**: Employee login name (required)
   - **Password**: Employee password (required)
   - **Role**: Select "Employee" or "Admin"
3. Click "Create User"
4. Share credentials with the employee

#### Manage Users

1. View all users in the "All Users" list
2. See each user's:
   - Username
   - Role (Employee or Admin)
   - Status (Active)
   - Created date
3. Click "Delete" to remove a user (cannot delete while viewing)

### Employee Access

Employees can:
- ✅ Search for Connections by ID, Institution Name, or EMIS_CODE
- ✅ View location on maps with the 📍 button
- ✅ Get directions to locations
- ✅ View complete record details
- ❌ Cannot create or manage users
- ❌ Cannot access the Admin Panel

### User Roles

| Feature | Employee | Admin |
|---------|----------|-------|
| Search Connections | ✅ Yes | ✅ Yes |
| View Maps | ✅ Yes | ✅ Yes |
| Get Directions | ✅ Yes | ✅ Yes |
| Create Users | ❌ No | ✅ Yes |
| View All Users | ❌ No | ✅ Yes |
| Delete Users | ❌ No | ✅ Yes |
| Access Admin Panel | ❌ No | ✅ Yes |

## API Endpoints

### Authentication Endpoints

#### Login Endpoint

```
?login=1&username=X&password=Y
```

**Response:**
```json
{
  "success": true,
  "username": "employee1",
  "role": "employee",
  "message": "Login successful"
}
```

#### Create User (Admin Only)

```
?action=create_user&username=X&password=Y&role=employee&adminUser=admin&adminPass=password
```

#### List Users (Admin Only)

```
?action=list_users&adminUser=admin&adminPass=password
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "username": "employee1",
      "role": "employee",
      "status": "active",
      "created": "2024-01-01"
    }
  ]
}
```

#### Delete User (Admin Only)

```
?action=delete_user&username=X&adminUser=admin&adminPass=password
```

### Search Endpoints

#### Suggest (Autocomplete)

```
?suggest=partial-text
```

Returns up to 15 matching results for dropdown.

#### Exact Lookup

```
?id=exact-connection-id-or-institution-name-or-emis-code
```

Returns the complete record for an exact Connection ID, Institution Name, or EMIS code match.

## Frontend Features

### Autocomplete Dropdown

- **Live Suggestions**: Type to see matching results in real-time
- **Multi-column Search**: Searches across Connection ID, Institution Name, and EMIS_CODE
- **Keyboard Navigation**: Use arrow keys to navigate suggestions
- **Click or Enter**: Select a result by clicking or pressing Enter
- **Smart Matching**: Partial text matching for flexible searching

### Result Display

Once a result is selected:
- Shows all fields from the matching row
- Displays data in a clean, organized table format
- Automatically updates when a new search is performed

### Geo Location Mapping

If your sheet contains a **Geo Location column** with latitude/longitude coordinates:

- **Map Icon**: A 📍 icon appears next to the location field in results
- **Click to Open**: Click the map icon to open the location in Google Maps
- **Full Map Preview**: A large map section displays below results with:
  - **"Go to Customer Location" Button**: Opens Google Maps at the exact customer location
  - **"Get Directions" Button**: Opens turn-by-turn navigation from your current location
  - **Embedded Map Preview**: Interactive map showing the location
  
- **Coordinate Format**: Supports "lat lng" or "lat,lng" format (e.g., `22.632139 90.167391`)

**To Enable Geo Location:**

1. Add a column to your Google Sheet with coordinates in latitude/longitude format
2. Name the column one of these headers (case-insensitive):
   - `16 Geo Location` (default, matches existing column naming)
   - `Geo Location`
   - `Location`
   - `Coordinates`
   - `Latitude Longitude`
3. Deploy the script and refresh the app — locations will automatically display with the map icon and full map section

## How to Run

### Option 1: Open auth.html directly

- Open `auth.html` in a browser
- Enter your credentials
- Login to access the EDC Lookup tool
- Use search features or manage employees (if admin)

### Option 2: Host on a web server

You can also host the pages on a simple static web server if needed.

Make sure both `auth.html` and `index.html` are deployed together in the same directory.

## Troubleshooting

### Login page shows "Connection error"

- Check that the `API_URL` in `auth.html` is correct
- Verify the Apps Script has been deployed as a web app
- Make sure "Who has access" is set to "Anyone"

### Sheet not found error

The value of `SHEET_NAME` does not exactly match the sheet tab name in Google Sheets.

### Column not found error

One or more column names (`EMIS_COLUMN`, `ID_COLUMN`, `NAME_COLUMN`) do not exactly match the headers in the first row of the sheet.

### User accounts

User accounts are stored in Apps Script Properties and are not shown in the Google Sheet. Existing accounts in a `Users` sheet are migrated once and that sheet is then deleted.

### Dropdown shows no suggestions

- Make sure you have typed at least one character
- Check that the sheet contains data with matching values
- Verify column names in `Code.gs` are correct
- Check `SUGGEST_LIMIT` is set to a value > 0 (default: 15)

### No match found for search

The exact ID is not present in the sheet, or the value does not match exactly (note: matching is case-insensitive).

### Slow autocomplete or dropdown

If the dropdown is slow:
- Reduce `SUGGEST_LIMIT` in `Code.gs` (default: 15)
- Ensure the sheet is not extremely large (100,000+ rows)
- Check your internet connection

## Notes

- **Autocomplete Matching**: Uses "contains" matching (case-insensitive) against both Connection ID and Institution Name columns
- **Exact Lookup**: Performs exact match (case-insensitive) on the Connection ID value
- **Header Row**: The first row is treated as the header row and is not searched
- **Data Display**: The matching row is returned as a JSON object with all columns
- **Searchable Fields**: Frontend searches against Connection ID, Institution Name, and EMIS_CODE (configurable in `Code.gs`)
- **Performance**: The suggest endpoint returns a limited number of results to keep the dropdown responsive
- **Geo Location Format**: Latitude and longitude must be in decimal format, separated by space or comma
  - Examples: `22.632139 90.167391` or `22.632139,90.167391`
  - Negative values for South/West: `-33.8688 151.2093`
- **Map Support**: Automatically detects and displays coordinates in any column named similarly to "Geo Location"
- **Session Management**: Login sessions are stored in browser sessionStorage (lost on browser close)
- **Security**: Passwords are transmitted and stored in sessionStorage for admin operations. For production use, consider adding HTTPS and more secure authentication methods.

## Security Considerations

⚠️ **Important for Production Use:**

1. **Always use HTTPS** - Never deploy on HTTP
2. **Change default admin credentials** immediately after setup
3. **Strong passwords** - Enforce strong password policies
4. **Regular backups** - Keep a secure record of administrator access
5. **Access control** - Limit who can deploy and manage the Apps Script
6. **Session timeout** - Add auto-logout after inactivity (not currently implemented)
7. **Audit logs** - Consider adding activity logging to track user actions
8. **Data encryption** - Consider encrypting sensitive data in the sheet

## License

This project is provided as-is for personal or internal use.

## Support

If the app is not working, check the following:

1. The Google Sheet data tab name matches `SHEET_NAME`
2. Column headers match exactly in the first row
3. The Apps Script was deployed as a web app
4. The generated URL was pasted into both HTML files
5. You are signed in with the correct Google account
6. Browser console shows no JavaScript errors (press F12)
7. Check Apps Script execution logs for backend errors

For debugging, open your browser's Developer Console (F12) and check:
- Network tab for failed requests
- Console tab for JavaScript errors
- Look for error messages from the Apps Script
