import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

async function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

// Map our sheet names to the Google Sheet tab names
const TAB_MAP = {
  'To Do': 'To do',
  'To Sell-Donate': 'To sell/donate',
  'To Buy': 'To buy',
  'To Pack-Ship': 'To pack/ship',
  'Address Update': 'Address update',
  'Box Contents': 'Box Contents',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({ error: 'Google Sheets not configured. Add GOOGLE_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY to Vercel env vars.' });
  }

  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const data = req.body;

    // Get existing sheet names
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);

    for (const [sheetName, rows] of Object.entries(data)) {
      const tabName = TAB_MAP[sheetName] || sheetName;

      // Create sheet if it doesn't exist
      if (!existingSheets.includes(tabName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{ addSheet: { properties: { title: tabName } } }]
          }
        });
        existingSheets.push(tabName);
      }

      // Clear existing data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tabName}'!A:Z`,
      });

      // Write new data
      if (rows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${tabName}'!A1`,
          valueInputOption: 'RAW',
          resource: { values: rows },
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Sheets sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
