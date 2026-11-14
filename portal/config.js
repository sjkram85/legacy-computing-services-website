/* Legacy Computing Services — employee portal settings.
   This file is public. Do not put passwords, API keys, customer names,
   prices, or file contents here.

   A Google OAuth Client ID is not a secret. Spreadsheet and Drive folder
   IDs are not secrets either, but the files themselves must be shared only
   with employees. Google, not this page, decides who can read them.

   Leave a value blank, or leave the YOUR_... placeholder, until it is real.
   The portal then shows a setup message instead of an error.

   The only allowed sign-in domain is allowedDomain. Change it in this one place. */
window.LCS_PORTAL = {
  /* From Google Cloud → Credentials → OAuth client ID → Web application.
     It ends with .apps.googleusercontent.com. Do not paste the client secret. */
  clientId: "530425506690-cif8h7vd43mn0ih5drigcg6aju49er5h.apps.googleusercontent.com",

  /* Workspace accounts on this domain only. The page checks the Google "hd" value. */
  allowedDomain: "legacycomputingservices.com",

  /* The long id in https://docs.google.com/spreadsheets/d/THIS_PART/edit
     Leave blank until you create the portal spreadsheet. */
  spreadsheetId: "",

  /* The long id in https://drive.google.com/drive/folders/THIS_PART
     Leave blank until the company docs folder exists. */
  driveFolderId: "",

  /* Optional. Calendar embedded on the dashboard.
     Leave blank to use the signed-in employee's primary calendar (their email).
     A calendar id is usually an email address. It is not a secret, but the
     calendar itself must be shared only with the people who should see it. */
  calendarId: "",

  /* Optional. Leave blank to keep the public contact form as email-only.
     When set, it must be a Google Apps Script web app URL ending in /exec.
     See docs/portal-setup.md and apps-script/inquiries.gs.
     The address will be public once it is saved in this file. */
  inquiriesWebhookUrl: ""
};
