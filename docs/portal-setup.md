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
- The public client intake form link (`intakeFormUrl`)
- Optionally, a **browser API key** for the Google file picker (`pickerApiKey`). Leave it blank until you restrict it. See [Attach a file that is already in Drive](#attach-a-file-that-is-already-in-drive).

Do **not** put a client secret, a password, customer names, or prices in that file. The intake form link is a public Google Form address, not a password. Do **not** put an API key that is not restricted to this website’s HTTP referrers.

Do **not** turn the spreadsheet or the Drive folder to “Anyone with the link.”

## What the portal does and does not protect

After an employee signs in, the page asks Google “what company is this account?” Google answers with a hosted domain (`hd`). The page allows only `legacycomputingservices.com`. A personal Gmail account is rejected, and that sign-in is revoked.

That check runs in the browser. A person who rewrites the page on their own computer could skip it. That does not give them your files. The spreadsheet and the Drive folder still have to be shared with their Google account. If they are not on the share list, Google returns nothing.

The sign-in token stays in the browser tab for about an hour. Closing the tab drops it. The website does not save the token.

The token can read and edit Google Sheets that this signed-in person can already open. It can also create and edit Google Docs, file a proposal Doc in the company docs folder, and, when you click the button on that proposal, set that one Doc so anyone with the link can view it. Attach from Drive uses the same token to pick a file, or to look up a file name when you paste a link. Removing an attachment only removes that link from the proposal row. It does not delete the Drive file. Share the portal spreadsheet and the docs folder with employees, and leave both Restricted. Do not rely on the page to hide some other spreadsheet that the same person can already open in Drive. The “anyone with the link” button changes only the proposal Doc you clicked. It does not change the spreadsheet or the docs folder.

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

## 3. Turn on the APIs

1. Go to **APIs & Services**, then **Library**.
2. Search for **Google Sheets API**. Open it. Click **Enable**.
3. Do the same for **Google Drive API**.
4. Do the same for **Google Calendar API**.
5. Do the same for **Google Docs API**.
6. Do the same for **Google Picker API** if you want **Attach from Drive** to open Google’s file picker. You can skip this until you are ready. Pasting a Drive link still works without the Picker API. The key and the referrer restriction are in [Attach a file that is already in Drive](#attach-a-file-that-is-already-in-drive).

The portal lists file names from Drive. Proposal Docs are created in the company docs folder (or a Proposals folder inside it). Attach from Drive can also look up the name of a file you paste, using Drive. It does not download the file. Calendar is used for the Upcoming list on the dashboard. The Gmail, Drive, Calendar, Meet, and Admin buttons are ordinary Google links. The portal does not send email.

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
- `.../auth/drive` — see, edit, and create Drive files this person can already open, so a proposal Doc can be filed in the company docs folder and, when you click the button, shared as anyone with the link can view
- `.../auth/documents` — create and edit the proposal Doc itself (logo, sections, and the quote table)
- `.../auth/calendar.readonly` — see events on their calendar
- openid, email, and profile — so the page can read the account and the company domain

`.../auth/documents` is the Google Docs scope. The Drive scope above replaces the older file-name-only scope (`drive.metadata.readonly`). An existing sign-in will be asked for the new Docs and Drive access the first time you create a proposal Doc or change its link. Internal apps still do not need Google’s public verification review.

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
6. Leave `spreadsheetId`, `driveFolderId`, `calendarId`, and `inquiriesWebhookUrl` empty for now. Blank `calendarId` embeds each signed-in employee’s own primary calendar. `intakeFormUrl` is the public client intake form. It can stay filled in. The portal does not submit that form.
7. Commit the change to the `main` branch.

Wait a minute or two for GitHub Pages to update. Then open the portal at `https://legacycomputingservices.com/portal/`.

You can also use the **Employee Login** link in the website footer. It is only in the footer. That link is relative (`portal/`), so it stays on whatever host you used to open the site.

Do not edit or delete the `CNAME` file in the repository. It contains `legacycomputingservices.com` and is what publishes the site on that domain.

The page should now show **Sign in with Google** instead of “Not configured yet.”

## 7. Create the spreadsheet from the portal

1. Open the portal and sign in with your company account.
2. If Google asks for permission, accept Sheets, Drive, Docs, and Calendar.
3. On the dashboard, click **Create the portal spreadsheet**.
4. Google creates a spreadsheet in **your** Drive named `Legacy Computing Services — Portal`.
5. The page shows an ID. Click **Copy ID**.
6. Edit `portal/config.js` again and paste that ID between the quotes for `spreadsheetId`. You can paste the full spreadsheet URL instead of the bare ID. Commit to `main`.

The spreadsheet has these tabs. Do not rename them. Do not delete the first row.

| Tab | Header row |
| --- | --- |
| Start here | Instructions only. The portal does not read this tab. |
| Tickets | ID, Created, Updated, Customer, Issue, Status, Priority, Assigned to, Opened, Due, Notes, Intake Sent |
| Customers | ID, Created, Updated, Name, Email, Phone, Company, Town, Notes |
| Inquiries | ID, Received, Name, Email, Phone, Service, Budget, Details, Status, Source, Notes |
| Quotes | ID, Number, Created, Updated, Customer, Status, Issued, Valid until, Tax, Notes |
| QuoteItems | ID, Quote ID, Quote number, Description, Qty, Unit price |
| Invoices | ID, Number, Created, Updated, Customer, Status, Issued, Due, Quote number, Tax, Notes |
| InvoiceItems | ID, Invoice ID, Invoice number, Description, Qty, Unit price |
| Proposals | ID, Prospect name, Business, Email, Phone, Title, Status, Created, Sent, Expires, Total, Doc URL, Notes, Sections, Line items, Customer ID, Job ID, Attachments |

Quote and invoice totals are added up in the portal from the quantity and unit price you type. A blank price stays blank. The portal does not invent a price. Leave **Tax** blank when there is no tax. There is no default tax rate.

Statuses the portal offers:

- Tickets: Open, In progress, Waiting on customer, Done
- Priority: Low, Normal, High, Urgent
- Inquiries: New, Reviewed, Replied, Closed
- Quotes: Draft, Sent, Accepted, Declined
- Proposals: Draft, Sent, Accepted, Declined
- Invoices: Draft, Sent, Paid, Void

If a tab is missing later, sign in and click **Add missing tabs and headers**. That fills empty tabs. It does not overwrite rows that already have data. If a header name is missing, such as **Intake Sent** or **Attachments**, that button adds it at the end of the header row. It does not rename or overwrite the header cells that are already there, and it does not rewrite the other cells on the row.

### Client intake form

`intakeFormUrl` in `portal/config.js` is the public Google Form for the client intake and service agreement. It is not a secret. The portal does not fill in the form, and it does not add `entry.` prefill fields. The plain link is enough.

On each ticket, **Send intake form** opens Gmail in a new tab. The draft goes to the email on the Customers tab when that customer’s name matches the ticket. If there is no email, type one. The typed address is only for the Gmail window. It is not saved on the customer.

You review the draft and press Send in Gmail. The portal does not send email.

The subject is `Legacy Computing Services – Client Intake & Service Agreement`. The note asks the customer to complete the intake and service agreement before work begins, includes the form link, and is signed Legacy Computing Services, scott@legacycomputingservices.com.

Opening the draft writes today’s date in **Intake Sent** on that ticket and shows an “Intake sent” badge. If that column is not on the header row yet, the portal adds **Intake Sent** at the end of the header. It does not rename or overwrite the other headers, and it does not rewrite the other cells on the ticket.

On a new ticket, check **Send intake form to customer** to open the same Gmail draft when you save.

### Proposals

The Proposals tab is for a prospect who does not have a customer row or a ticket yet. Open **Proposals** in the portal and add one. If that tab is missing, the page adds it and writes the header row. Other tabs stay as they are, including their header cells. **Add missing tabs and headers** does the same thing for every tab, including Proposals.

Sections, Line items, and Attachments are JSON the portal writes. You do not need to edit that JSON by hand. Customer ID and Job ID stay blank until you mark the proposal accepted. Job ID is the ID on the Tickets tab. If the **Attachments** header is missing, opening Proposals adds that name at the end of the header row. Existing header cells and existing data stay put.

The editor has the client, a project overview, scope and deliverables, a timeline, price lines (description, quantity, unit price), terms, and an expiration date. The total is added up from the lines. A blank price stays blank. The portal does not invent a price. Internal notes stay on the row. They are left out of the Google Doc.

**Preview layout** shows the proposal on this page. **Create Google Doc** builds the real Doc with the signed-in person’s Google access:

- The file goes in a **Proposals** folder inside the company docs folder (`driveFolderId`). If that folder ID is blank, the Proposals folder is created in that person’s My Drive instead.
- The top of the Doc is the Legacy shield, loaded from the public site address `https://legacycomputingservices.com/assets/legacy-computing-shield.png`, then **Legacy Computing Services LLC**, the tagline **Protecting what matters. Building what's next.**, and **Bel Air, MD | scott@legacycomputingservices.com | legacycomputingservices.com**.
- Then: prepared for, date, valid until, overview, scope and deliverables, timeline, a quote table (line items, subtotal, total), terms, and a signature block.
- The Doc link is saved in **Doc URL**. Creating again makes a new Doc and updates the link. The older Doc is left in Drive.

The Doc stays restricted until you click **Anyone with the link can view**. That uses Drive permissions on that Doc only. The spreadsheet and the docs folder stay Restricted. Do that before a prospect who does not have a company Google account tries to open the link.

**Send** opens Gmail in a new tab with a draft to the prospect. The draft includes the Doc link when there is one, and any Drive files linked on the row. You read it and press Send in Gmail. This page does not send email. The status becomes Sent, and the Sent column is filled with today’s date when that date was empty. If the proposal is already Accepted or Declined, the draft still opens and the status stays as it is. A proposal needs a Doc link or at least one Drive file before Send can open the draft.

**Mark accepted** saves the prospect as a customer (it reuses a customer with the same email, or the same name) and opens a ticket for the work. It then offers **Send intake form**, which is the same Gmail draft used on tickets. **Mark declined** sets the status to Declined. Declined is also in the status list on the proposal. A customer or ticket that was already created stays on those tabs.

### Attach a file that is already in Drive

Some proposals are already a Doc or a PDF in Drive. You do not have to type line items or press **Create Google Doc** for those.

On the proposal card and in the editor, **Attach from Drive** stores a link on that row. The **Attachments** cell is a JSON list of the file id, name, type, and link. The portal writes it. You do not edit that cell by hand.

The proposal shows each file as a link with an icon for the type (PDF, Google Doc, Sheet, Slides, image, folder, or a plain file). **Remove** deletes only that link. The file stays in Drive.

You can save a new proposal with the prospect, one attached file, and a status. Set the status to **Sent** and fill **Sent date** when it was already sent outside the portal. If you leave the date blank, the page uses today. The title and the price lines can stay empty.

**Send** opens a Gmail draft that includes those file links. If the proposal also has a Doc from **Create Google Doc**, the draft includes that Doc link too. You still press Send in Gmail. This page does not send email.

**Attach from Drive** opens Google’s file picker when `pickerApiKey` is set. The picker uses the person who is already signed in. It does not ask for a second Google account. The picker shows Docs, folders, and shared drives, and you can pick more than one file. The page loads the picker from `https://apis.google.com/js/api.js`. The Cloud project number comes from the Client ID (the digits before the hyphen). You do not paste that number yourself.

To turn the picker on, in the same Cloud project as the Client ID:

1. Enable **Google Picker API**. **APIs & Services**, **Library**, search **Google Picker API**, **Enable**.
2. Create a browser API key. **APIs & Services**, **Credentials**, **Create credentials**, **API key**.
3. Edit the key before you paste it into the website.
4. Under **Application restrictions**, choose **HTTP referrers (web sites)**.
5. Add these referrers. The star is part of the referrer rule. It is not a share setting.

   - `https://legacycomputingservices.com/*`
   - `https://www.legacycomputingservices.com/*`
   - `https://sjkram85.github.io/*`
   - `http://localhost:8000/*` (only so you can try the page on your own computer)

6. Under **API restrictions**, choose **Restrict key**, and select **Google Picker API** only.
7. Save.
8. Paste the key into `pickerApiKey` in `portal/config.js`. Keep the quotes. Commit to `main`.

This key is not a client secret, and it does not let a stranger read Drive by itself. The signed-in person’s token is what opens the files. An unrestricted key can still be copied from this public file and used against your Cloud quota, so the referrer restriction is required. Do not put a client secret, or a key with no referrer restriction, in `portal/config.js`.

Leave `pickerApiKey` blank if you do not want the picker yet. **Attach from Drive** then asks for a Drive file link or the file ID. The page looks up the name with Drive (`files.get`) and the signed-in account. It still does not download the file, and it does not delete it. A sample preview in the browser does not call Google. It only shows a sample name so you can check the layout.

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

The Docs tab lists the files. **Preview** opens a file inside the portal. A normal file uses `https://drive.google.com/file/d/FILE_ID/preview`. Google Docs, Sheets, and Slides use their `/preview` address, and **Edit in the page** switches that frame to `/edit?rm=minimal`. **Close** returns to the list. **Open in Google (new tab)** leaves the portal. Folders stay as a new-tab link, because a folder is not a file preview. Nothing is copied onto this website. Google still checks that the file is shared with the signed-in account.

## 10. Calendar embed and the spreadsheet tab

`calendarId` in `portal/config.js` is optional.

- Leave it blank. The dashboard then embeds the signed-in employee’s primary calendar. That id is their email address. The page only learns the email after sign-in, so it is not stored in this file.
- Or paste one shared calendar’s id, which is usually an email address such as the address of a company calendar. Share that calendar with the employees who should see it. The id is not a secret. Google still blocks anyone the calendar is not shared with.

The frame is `https://calendar.google.com/calendar/embed?src=...&ctz=America/New_York`. A wide window uses week view. A narrow window uses agenda mode. Google draws the calendar grid, so the dark page color is as far as the embed can follow this site. If Calendar access was granted at sign-in, a short upcoming list is also shown. That list is the fallback. It is not a second copy of the company calendar stored here.

Gmail cannot be placed in a frame. The Gmail, Drive, Calendar, Meet, and Admin shortcuts are labeled **Opens in a new tab**.

The **Spreadsheet** tab embeds the portal spreadsheet at `/edit?rm=minimal` once `spreadsheetId` is set. Use it when you want to edit cells without leaving the portal. Sharing on the Google Sheet is still the lock. **Open in a new tab** is there too.

## 11. What employees do

1. Open the portal from the footer link.
2. Click **Sign in with Google**.
3. Choose their `@legacycomputingservices.com` account.
4. Accept the permissions the first time.

They then get:

- Shortcuts to Gmail, Drive, Calendar, Meet, and the Admin console, each opening in a new tab (Admin only works for Workspace admins). Gmail cannot be embedded.
- The company calendar embedded on the dashboard, plus a short upcoming list when Calendar access was granted
- Tickets, customers, inquiries, proposals, quotes, and invoices from the spreadsheet
- **Proposals**, including a Google Doc in the company docs folder, Drive file links on proposals that were already written outside the portal, and a Gmail draft. The page does not send the email.
- **Send intake form** on each ticket, and again after a proposal is accepted. It opens a Gmail draft. It does not send the email from this page.
- A Spreadsheet tab that embeds that same Google Sheet for editing
- A print view for a quote or invoice. The browser’s print dialog can save a PDF. The portal does not upload that PDF.
- The docs list, once the folder ID is set, with an in-page preview

**Preview with sample data** is a fake dashboard for looking at the layout. The amber banner says it is sample data. Those names and dollar amounts are not company records and are not saved.

## 12. Optional: website inquiries into the sheet

The public contact form still only prepares an email to scott@legacycomputingservices.com. The visitor must press Send in their email app. Do not remove that.

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
- **Google API is turned off** — go back to step 3 and enable Sheets, Drive, Docs, and Calendar on the same Cloud project as the Client ID. Proposal Docs need Docs and Drive. The file picker also needs **Google Picker API**. Pasting a Drive link only needs Drive.
- **Google refused this file** — the spreadsheet, folder, or pasted Drive file is not shared with the person who signed in, or the ID in `portal/config.js` is wrong.
- **The file picker does not open** — `pickerApiKey` is blank, the Picker API is off, or the key’s HTTP referrers do not include the site in the address bar. **Attach from Drive** still accepts a pasted Drive link. Pop-ups must be allowed, because the picker is a Google window.
- **Redirect URI mismatch or origin error** — the address in the browser bar’s origin is not in the JavaScript origins list. Origins have no path. Add `https://legacycomputingservices.com`, `https://www.legacycomputingservices.com`, and `https://sjkram85.github.io`. `https://legacycomputingservices.com/portal` is not an origin.
- **Sign-in expired** — sign out and sign in again. Tokens last about an hour.

## Try it on your computer before Pages updates

From the repository folder:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/portal/`. This works only if `http://localhost:8000` is one of the JavaScript origins. The sample preview works with no Client ID at all.
