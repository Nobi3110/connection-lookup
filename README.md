# Connection Lookup

A lightweight Google Apps Script and HTML project that searches a Google Sheet by an exact Connection ID and returns the matching record.

## Overview

This project is designed for quick record lookup from a spreadsheet using a unique identifier such as `01 Connection ID`.

It has two main components:

- `Code.gs` — the Google Apps Script backend that reads the Google Sheet and returns JSON data
- `index.html` — the frontend interface that lets users type a Connection ID and view the result

## Features

- Search records by exact Connection ID
- Case-insensitive matching
- Returns the full matching row as JSON
- Displays the record in a clean browser UI
- Uses Google Sheets as the data source
- Easy to deploy as a Google Apps Script web app

## Project Structure

```text
First App/
├── Code.gs
├── index.html
├── README.md
└── Google Apps Script deployment
```

## Requirements

- A Google account
- A Google Sheet containing the lookup data
- A header row with the Connection ID column
- Access to Google Apps Script

## Setup Instructions

### 1. Prepare the Google Sheet

Make sure your spreadsheet contains:

- the correct sheet/tab name
- a header row with the Connection ID field
- values that match the IDs you want to search

Example values:

- Sheet name: `Audit All Links (English)`
- Column name: `01 Connection ID`

### 2. Update the Apps Script settings

Open `Code.gs` and verify these lines:

```javascript
var SHEET_NAME = "Audit All Links (English)";
var ID_COLUMN = "01 Connection ID";
```

If your sheet name or header text is different, change them to match the exact names in your spreadsheet.

### 3. Deploy the script as a web app

In Google Apps Script:

1. Open your Apps Script project
2. Click `Deploy` → `New deployment`
3. Choose `Web app`
4. Set:
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`
5. Click `Deploy`
6. Copy the generated web app URL

### 4. Connect the frontend to the web app

Open `index.html` and replace the placeholder:

```javascript
const API_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with the URL copied from Apps Script:

```javascript
const API_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

## How to Run

### Option 1: Open the HTML file directly

- Open `index.html` in a browser
- Enter a Connection ID
- Click `Search`

### Option 2: Host it on a web server

You can also host the page on a simple static web server if needed.

## Example Request

The frontend sends a request like this:

```text
YOUR_WEB_APP_URL?id=ABC123
```

The Apps Script returns JSON similar to:

```json
{
  "found": true,
  "data": {
    "01 Connection ID": "ABC123",
    "02 Institution / Office Name": "Example Office",
    "03 IP": "192.168.1.10",
    "04 MAC Address": "00:1A:2B:3C:4D:5E"
  }
}
```

## Troubleshooting

### Sheet not found

This means the value of `SHEET_NAME` does not exactly match the sheet tab name in Google Sheets.

### Column not found

This means the value of `ID_COLUMN` does not exactly match the header in the first row of the sheet.

### Could not reach the server

This usually means one of the following:

- the `API_URL` is still a placeholder
- the Apps Script project has not been deployed yet
- the URL is incorrect
- the wrong Google account is being used

### No match found

This means the ID is not present in the sheet, or the value does not match exactly.

## Notes

- Matching is case-insensitive
- Matching is exact for the searched ID value
- The first row is treated as the header row
- The matching row is returned as a JSON object

## License

This project is provided as-is for personal or internal use.

## Support

If the app is not working, check the following:

1. The Google Sheet tab name matches exactly
2. The column header matches exactly
3. The Apps Script was deployed as a web app
4. The generated URL was pasted into `index.html`
5. You are signed in with the correct Google account
