# Connection Lookup

A lightweight Google Apps Script and HTML project that searches a Google Sheet by an exact Connection ID and returns the matching record.

## Overview

This project is designed for quick record lookup from a spreadsheet using unique identifiers such as Connection ID, Institution Name, or EMIS_CODE. It features an interactive autocomplete dropdown that provides suggestions as you type, making searching faster and more intuitive.

It has two main components:

- `Code.gs` — the Google Apps Script backend that reads the Google Sheet and provides two endpoints:
  - `/suggest` — returns suggestions for partial text matching (for autocomplete)
  - `/id` — returns exact matching records by Connection ID
- `index.html` — the frontend interface with an interactive dropdown that lets users type and get real-time suggestions

## Features

- **Autocomplete Dropdown**: Real-time suggestions as you type
- **Multi-field Search**: Search by Connection ID, Institution Name, or EMIS_CODE
- **Partial Matching**: Dropdown suggestions use "contains" matching for flexible searching
- **Exact Lookup**: Get complete matching records with exact Connection ID search
- **Geo Location Mapping**: Click the 📍 map icon to view locations in Google Maps
- **Directions**: Get directions to any mapped location directly from results
- **Embedded Map Preview**: View locations on an embedded map below results
- **Case-insensitive Matching**: Works with any character case
- **Full Record Display**: Returns and displays the entire matching row as JSON
- **Clean UI**: Professional browser interface with responsive design
- **Google Sheets Backend**: Uses Google Sheets as the data source
- **Easy Deployment**: Simple setup as a Google Apps Script web app

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
var NAME_COLUMN = "02 Institution / Office Name";
var SUGGEST_LIMIT = 15; // max rows returned by the suggest endpoint
```

If your sheet name, column names, or desired suggest limit is different, update them to match your spreadsheet. The `SUGGEST_LIMIT` controls how many suggestions appear in the dropdown.

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
- Type a Connection ID, Institution Name, or EMIS_CODE in the search box
- As you type, a dropdown shows matching suggestions
- Click on a suggestion or press Enter to get the full record details

### Option 2: Host it on a web server

You can also host the page on a simple static web server if needed.

## API Endpoints

The Apps Script backend provides two endpoints:

### 1. Suggest Endpoint (Autocomplete)

Returns a list of matching records for dropdown suggestions while typing.

```text
YOUR_WEB_APP_URL?suggest=partial-text
```

**Response:**

```json
{
  "matches": [
    { "id": "SD-135-J-K-6", "name": "Example Institution" },
    { "id": "SD-135-J-K-7", "name": "Another Institution" }
  ]
}
```

**Behavior:**
- Returns up to `SUGGEST_LIMIT` results (default: 15)
- Matches against both Connection ID and Institution Name
- Uses "contains" matching (case-insensitive)
- Returns abbreviated data (id and name only)

### 2. Lookup Endpoint (Exact Match)

Returns the complete record for an exact Connection ID match.

```text
YOUR_WEB_APP_URL?id=exact-connection-id
```

**Response:**

```json
{
  "found": true,
  "data": {
    "01 Connection ID": "SD-135-J-K-6",
    "02 Institution / Office Name": "Example Institution",
    "03 EMIS_CODE": "1234567",
    ...other columns...
  }
}
```

**Behavior:**
- Performs exact match on Connection ID
- Returns the entire row as a JSON object
- Case-insensitive matching
- Returns error if Connection ID not found

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
  - **"Go to Customer Location" Button**: Click to open Google Maps at the exact customer location
  - **"Get Directions" Button**: Click to open turn-by-turn navigation from your current location
  - **Embedded Map Preview**: Interactive map preview of the location
  
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

## Example Request

The frontend can send two types of requests to the Apps Script:

**Suggest Request (for dropdown):**

```text
YOUR_WEB_APP_URL?suggest=SD
```

Returns matching suggestions (up to 15 results).

**Lookup Request (for full record):**

```text
YOUR_WEB_APP_URL?id=SD-135-J-K-6
```

The Apps Script returns JSON similar to:

```json
{
  "found": true,
  "data": {
    "01 Connection ID": "SD-135-J-K-6",
    "02 Institution / Office Name": "Example Institution",
    "03 EMIS_CODE": "1234567",
    "04 IP": "192.168.1.10",
    "05 MAC Address": "00:1A:2B:3C:4D:5E"
  }
}
```

## Troubleshooting

### Sheet not found

This means the value of `SHEET_NAME` does not exactly match the sheet tab name in Google Sheets.

### Column not found

This means one or more column names (`ID_COLUMN`, `NAME_COLUMN`) do not exactly match the headers in the first row of the sheet.

### Dropdown shows no suggestions

- Make sure you have typed at least one character
- Check that the sheet contains data with matching values
- Verify column names in `Code.gs` are correct
- Check `SUGGEST_LIMIT` is set to a value > 0 (default: 15)

### Could not reach the server

This usually means one of the following:

- the `API_URL` is still a placeholder
- the Apps Script project has not been deployed yet
- the URL is incorrect
- the wrong Google account is being used
- CORS or permissions issues (Apps Script must allow "Anyone")

### No match found

This means the exact ID is not present in the sheet, or the value does not match exactly (though matching is case-insensitive).

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

## License

This project is provided as-is for personal or internal use.

## Support

If the app is not working, check the following:

1. The Google Sheet tab name matches exactly
2. The column header matches exactly
3. The Apps Script was deployed as a web app
4. The generated URL was pasted into `index.html`
5. You are signed in with the correct Google account
