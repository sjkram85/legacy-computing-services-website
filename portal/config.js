/* Legacy Computing Services — employee portal settings.
   This file is public. Do not put a client secret, a password, customer
   names, prices, or file contents here. Do not put an API key that is
   not restricted to this website.

   A Google OAuth Client ID is not a secret. Spreadsheet and Drive folder
   IDs are not secrets either, but the files themselves must be shared only
   with employees. Google, not this page, decides who can read them.

   pickerApiKey is optional. It is a browser key for the Google file picker
   only after you restrict it to this site's HTTP referrers and to the
   Picker API. Leave it blank to paste a Drive link instead.
   See docs/portal-setup.md.

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
  spreadsheetId: "14ZcwghtxRdwyD1UOh_sxXzvrhHnU2N9sg6ocQ-O7o0Q",

  /* The long id in https://drive.google.com/drive/folders/THIS_PART
     Leave blank until the company docs folder exists. */
  driveFolderId: "16Iou2GSjYW95HuCmUJmKgZz0SAjI5sl2",

  /* Optional. Calendar embedded on the dashboard.
     Leave blank to use the signed-in employee's primary calendar (their email).
     A calendar id is usually an email address. It is not a secret, but the
     calendar itself must be shared only with the people who should see it. */
  calendarId: "",

  /* Optional. Leave blank to keep the public contact form as email-only.
     When set, it must be a Google Apps Script web app URL ending in /exec.
     See docs/portal-setup.md and apps-script/inquiries.gs.
     The address will be public once it is saved in this file. */
  inquiriesWebhookUrl: "https://script.google.com/macros/s/AKfycbxXent-Sa4smfBZmx8SguDFRKu8CWtB8c7AaqPYQUik2XrL3NEhjSUuIy_380BVN6evFA/exec",

  /* Public Google Form for the client intake and service agreement.
     Not a secret. The portal only places this link in a Gmail draft.
     It does not submit the form and it does not add entry. prefill fields.
     Leave blank, or leave a YOUR_... placeholder, to turn the button off. */
  intakeFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdlt6J9Ew889ZO0dq4z6yzTrxb1FSuutsxvAiVGYX-5679tSQ/viewform",

  /* Optional. The one online payment page for Legacy Computing Services, LLC.
     Academy invoices use this same address. There is no separate bowling
     bank account or merchant account. Leave blank until a provider is chosen.
     An https address only. Not a password. */
  paymentUrl: "",

  /* Optional browser key for Attach from Drive (Google Picker).
     Not a client secret. Leave blank until the key is restricted to this
     site's HTTP referrers and to the Google Picker API. An unrestricted
     key must not be saved here. Blank uses a pasted Drive link instead.
     See docs/portal-setup.md. */
  pickerApiKey: ""
};
