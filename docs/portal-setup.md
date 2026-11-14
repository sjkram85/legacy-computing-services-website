# Set up the employee portal

This is for Scott. You do not need to be a programmer. The portal is a private-looking page on the public website. It does not hold customer lists, prices, or files. Those stay in Google, and Google decides who can open them.

Plan on two sittings if you have not used Google Cloud before. The first sitting creates sign-in. The second creates the spreadsheet and shares it.

## What is safe to put in the website

The website repository is public. Anyone can read it.

Put only these values in `portal/config.js`:

- The Google **Client ID** (it is not a password)
- The allowed email domain, already set to `legacycomputingservices.com`
- The spreadsheet ID
- The Drive folder ID
- Optionally, the Apps Script web address for website inquiries

Do **not** put a client secret, a password, customer names, or prices in that file.

Do **not** turn the spreadsheet or the Drive folder to “Anyone with the link.”

## What the portal does and does not protect

After an employee signs in, the page asks Google “what company is this account?” Google answers with a hosted domain (`hd`). The page allows only `legacycomputingservices.com`. A personal Gmail account is rejected, and that sign-in is revoked.

That check runs in the browser. A person who rewrites the page on their own computer could skip it. That does not give them your files. The spreadsheet and the Drive folder still have to be shared with their Google account. If they are not on the share list, Google returns nothing.

The sign-in token stays in the browser tab for about an hour. Closing the tab drops it. The website does not save the token.

The token can read and edit Google Sheets that this signed-in person can already open, and it can list Drive file names. Share the portal spreadsheet and the docs folder with employees. Do not rely on the page to hide some other spreadsheet that the same person can already open in Drive.

## 1. Open Google Cloud as the company

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Sign in with your **legacycomputingservices.com** admin account. Do not use a personal Gmail account. A personal account cannot make an Internal app for the company.
3. If Google asks you to accept terms, accept them for the organization.

## 2. Create a project

1. At the top, open the project picker.
2. Click **New project**.
3. Name it `Legacy Computing Portal`.
4. If it asks for an organization, choose legacycomputingservices.com.
5. Create it, then make sure that project is selected at the top of the page.

## 3. Turn on the three APIs

1. Go to **APIs & Services**, then **Library**.
2. Search for **Google Sheets API**. Open it. Click **Enable**.
3. Do the same for **Google Drive API**.
4. Do the same for **Google Calendar API**.

The portal lists file names from Drive. It does not download file contents. Calendar is used for the Upcoming list on the dashboard. The Gmail, Drive, Calendar, Meet, and Admin buttons are ordinary Google links.

## 4. Set the consent screen to Internal

1. Go to **APIs & Services**, then **OAuth consent screen** (Google may label this **Google Auth platform** or **Branding**).
2. If it asks for a user type, choose **Internal**. Internal means only people in your Workspace can sign in. Do not choose External.
3. App name: `Legacy Computing Portal`.
4. User support email: your company address.
5. If it asks for an authorized domain, enter `legacycomputingservices.com`.
6. Save.

If **Internal** is missing, you are signed in with the wrong Google account, or the Cloud project is not inside the company. Stop and fix that before continuing. An External app would let any Google account try the consent screen.

Add these scopes if the screen has a scopes or data-access step. Names in the list may be the long URL or a sentence:

- `.../auth/spreadsheets` — see and edit spreadsheets this person can already open
- `.../auth/drive.metadata.readonly` — see file names and links in Drive
- `.../auth/calendar.readonly` — see events on their calendar
- openid, email, and profile — so the page can read the account and the company domain

You can also skip adding them by hand. The first time you sign in, Google shows the same permissions and you accept them. Internal apps do not need Google’s public verification review.

## 5. Create the sign-in client

1. Go to **APIs & Services**, then **Credentials**.
2. Click **Create credentials**, then **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Legacy Computing portal`.
5. Under **Authorized JavaScript origins**, add each of these exactly. No path. No slash at the end.

   - `https://legacycomputingservices.com`
   - `https://www.legacycomputingservices.com`
   - `https://sjkram85.github.io`
   - `http://localhost:8000` (only so you can try the page on your own computer)

   The live site is `https://legacycomputingservices.com`. `https://www.legacycomputingservices.com` currently redirects to that same site, and `https://sjkram85.github.io/legacy-computing-services-website/` does too. Sign-in still needs each origin listed, because Google checks the host in the address bar and ignores the path. Do not add `https://legacycomputingservices.com/portal`. That is a page, not an origin.

6. Leave **Authorized redirect URIs** empty. This portal uses a Google pop-up, not a redirect.
7. Click **Create**.
8. Copy the **Client ID**. It ends with `.apps.googleusercontent.com`.
9. Ignore the **client secret**. Do not copy it into the website.

## 6. Paste the Client ID

1. On GitHub, open this repository.
2. Open `portal/config.js`.
3. Click the pencil to edit.
4. Replace `YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com` with the Client ID you copied. Keep the quotes.
5. Leave `allowedDomain` as `legacycomputingservices.com` unless the company domain changes. That one line is the only place the allowed domain is set.
6. Leave `spreadsheetId`, `driveFolderId`, and `inquiriesWebhookUrl` empty for now.
7. Commit the change to the `main` branch.

Wait a minute or two for GitHub Pages to update. Then open the portal at `https://legacycomputingservices.com/portal/`.

You can also use the **Employee Login** link in the website footer. It is only in the footer. That link is relative (`portal/`), so it stays on whatever host you used to open the site.

Do not edit or delete the `CNAME` file in the repository. It contains `legacycomputingservices.com` and is what publishes the site on that domain.

The page should now show **Sign in with Google** instead of “Not configured yet.”

## 7. Create the spreadsheet from the portal

1. Open the portal and sign in with your company account.
2. If Google asks for permission, accept Sheets, Drive file info, and Calendar.
3. On the dashboard, click **Create the portal spreadsheet**.
4. Google creates a spreadsheet in **your** Drive named `Legacy Computing Services — Portal`.
5. The page shows an ID. Click **Copy ID**.
6. Edit `portal/config.js` again and paste that ID between the quotes for `spreadsheetId`. You can paste the full spreadsheet URL instead of the bare ID. Commit to `main`.

The spreadsheet has these tabs. Do not rename them. Do not delete the first row.

| Tab | Header row |
| --- | --- |
| Start here | Instructions only. The portal does not read this tab. |
| Tickets | ID, Created, Updated, Customer, Issue, Status, Priority, Assigned to, Opened, Due, Notes |
| Customers | ID, Created, Updated, Name, Email, Phone, Company, Town, Notes |
| Inquiries | ID, Received, Name, Email, Phone, Service, Budget, Details, Status, Source, Notes |
| Quotes | ID, Number, Created, Updated, Customer, Status, Issued, Valid until, Tax, Notes |
| QuoteItems | ID, Quote ID, Quote number, Description, Qty, Unit price |
| Invoices | ID, Number, Created, Updated, Customer, Status, Issued, Due, Quote number, Tax, Notes |
| InvoiceItems | ID, Invoice ID, Invoice number, Description, Qty, Unit price |

Quote and invoice totals are added up in the portal from the quantity and unit price you type. A blank price stays blank. The portal does not invent a price. Leave **Tax** blank when there is no tax. There is no default tax rate.

Statuses the portal offers:

- Tickets: Open, In progress, Waiting on customer, Done
- Priority: Low, Normal, High, Urgent
- Inquiries: New, Reviewed, Replied, Closed
- Quotes: Draft, Sent, Accepted, Declined
- Invoices: Draft, Sent, Paid, Void

If a tab is missing later, sign in and click **Add missing tabs and headers**. That fills empty tabs. It does not overwrite rows that already have data.

### If the button fails

Create a Google Sheet yourself, add the tabs above, and type the header row exactly. Then paste the spreadsheet ID into `portal/config.js`. The **Start here** tab is optional if you build it by hand.

## 8. Share the spreadsheet

1. Open the spreadsheet. Click **Share**.
2. Add each employee’s company email address, including yours if you are not the owner. Editor is the right level if they will update tickets and quotes.
3. Leave **General access** on **Restricted**.
4. Do not choose **Anyone with the link**. The ID will be in the public website file. Restricted sharing is what keeps strangers out.

## 9. Company docs folder

1. In Google Drive, create a folder, for example `Legacy Computing docs`.
2. Put how-tos and other company files in it.
3. Click **Share** and add the same people. Restricted, not anyone with the link.
4. Open the folder. The address looks like `https://drive.google.com/drive/folders/THIS_PART`.
5. Copy `THIS_PART` into `driveFolderId` in `portal/config.js`. You can paste the whole folder URL. Commit to `main`.

The Docs tab lists names and links. Employees open the file in Drive.

## 10. What employees do

1. Open the portal from the footer link.
2. Click **Sign in with Google**.
3. Choose their `@legacycomputingservices.com` account.
4. Accept the permissions the first time.

They then get:

- Links to Gmail, Drive, Calendar, Meet, and the Admin console (Admin only works for Workspace admins)
- Tickets, customers, inquiries, quotes, and invoices from the spreadsheet
- A print view for a quote or invoice. The browser’s print dialog can save a PDF. The portal does not upload that PDF.
- The docs list, once the folder ID is set

**Preview with sample data** is a fake dashboard for looking at the layout. The amber banner says it is sample data. Those names and dollar amounts are not company records and are not saved.

## 11. Optional: website inquiries into the sheet

The public contact form still only prepares an email to info@legacycomputingservices.com. The visitor must press Send in their email app. Do not remove that.

If you also want a row on the Inquiries tab:

1. Open the portal spreadsheet.
2. Click **Extensions**, then **Apps Script**.
3. Delete any sample code in the editor.
4. Paste the contents of `apps-script/inquiries.gs` from this repository.
5. Click **Save** (the disk icon). Name the project `Portal inquiries` if it asks.
6. Click **Deploy**, then **New deployment**.
7. Click the gear next to “Select type” and choose **Web app**.
8. Execute as: **Me**.
9. Who has access: **Anyone**.
10. Click **Deploy**. Approve the permissions. They let the script add a row to your spreadsheet.
11. Copy the **Web app URL**. It must end in `/exec`.
12. Paste it into `inquiriesWebhookUrl` in `portal/config.js` and commit.

That address will be public, because the config file is public. Anyone who reads the repository can submit a fake inquiry. The script only **adds** a row. It never sends back your customer list. The email is still the message you can trust. The portal tells the visitor it cannot confirm that Google stored the copy.

Leave `inquiriesWebhookUrl` empty to keep the form as email-only. That is the default.

### Google Form instead

You can skip the website POST and use a Google Form whose results you copy into the sheet.

1. Create a Form with questions named Name, Email, Phone, Service, Budget, and Details.
2. In Apps Script on the portal spreadsheet, keep `onFormSubmit` from `inquiries.gs`.
3. In the script editor, click the clock icon (**Triggers**), then **Add trigger**.
4. Function: `onFormSubmit`. Event: **From form**, **On form submit**.
5. Point the Form’s destination at this spreadsheet, or link the form from the sheet.

The form will create its own response tab. The trigger copies a row onto **Inquiries**, which is the tab the portal reads.

## When something goes wrong

- **Not configured yet** — the Client ID is missing or still the placeholder. Finish step 6.
- **Pop-up blocked** — allow pop-ups for the site and click Sign in again.
- **Not a company account** — the Google account’s hosted domain is not `legacycomputingservices.com`. Use the company account, not Gmail.
- **Google API is turned off** — go back to step 3 and enable Sheets, Drive, and Calendar on the same Cloud project as the Client ID.
- **Google refused this file** — the spreadsheet or folder is not shared with the person who signed in, or the ID in `portal/config.js` is wrong.
- **Redirect URI mismatch or origin error** — the address in the browser bar’s origin is not in the JavaScript origins list. Origins have no path. Add `https://legacycomputingservices.com`, `https://www.legacycomputingservices.com`, and `https://sjkram85.github.io`. `https://legacycomputingservices.com/portal` is not an origin.
- **Sign-in expired** — sign out and sign in again. Tokens last about an hour.

## Try it on your computer before Pages updates

From the repository folder:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/portal/`. This works only if `http://localhost:8000` is one of the JavaScript origins. The sample preview works with no Client ID at all.
