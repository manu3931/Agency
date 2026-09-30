/* Lets the live site's "Sync from Google Sheet" read the rate card straight from the sheet.

   1. In the Google Sheet: Extensions, Apps Script. Replace everything there with this file and save.
   2. Project Settings (the gear icon), Script properties, Add: SYNC_KEY = a long random string
      (for example, run `openssl rand -hex 24` and paste the result).
   3. Deploy, New deployment, type Web app. Execute as: Me. Who has access: Anyone. Deploy, and allow it.
   4. Copy the web app URL, add ?key=<your SYNC_KEY> to the end, and paste the whole thing into the site's
      Settings, Rate card, Sheet link. Only the team can see it there.

   The link hands out the Inventory, Packages and Labor tabs, values and notes included, to anyone who has it,
   which is why it needs the key. To cut it off, change SYNC_KEY. */
function doGet(e) {
  var key = PropertiesService.getScriptProperties().getProperty('SYNC_KEY');
  if (!key || !e || !e.parameter || e.parameter.key !== key) return out({ error: 'That sheet link has the wrong key. Check it in the Apps Script project.' });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tab = function (name, range) { var sh = ss.getSheetByName(name); return sh ? sh.getRange(range).getDisplayValues() : []; };
  return out({ inventory: tab('Inventory', 'A1:Q500'), packages: tab('Packages', 'A1:H20'), labor: tab('Labor', 'A1:F20'), at: new Date().toISOString() });
}
function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
