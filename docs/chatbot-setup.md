# Set up the homepage chat assistant

This is for Scott. You do not need to be a programmer. The chat bubble on the public homepage does nothing until you finish these steps. Until then it stays hidden, so the live site is unchanged.

The assistant answers short questions about Legacy Computing Services. Quotes, scheduling, and anything it does not know go to the contact form and to scott@legacycomputingservices.com.

## What must never go in the website

The website repository is public. Anyone can read it.

The Gemini API key stays in Google, in Apps Script → Project Settings → Script properties. The name of that property is `GEMINI_API_KEY`.

Do **not** paste the key into `index.html`, into `apps-script/chatbot.gs`, into a GitHub comment, or into an email to yourself that you then commit.

The only value that goes in the website is the Apps Script web address. It ends in `/exec`. That address is not the key, but it is public once you save it. Anyone who can see the site can send a chat to it.

## What protects the bill

Two limits are the whole safeguard:

1. This script counts requests and stops at **300 per day** (midnight Eastern) unless you set a different `DAILY_LIMIT`. When the cap is hit, the visitor sees a short note to use the contact form. The counter resets the next day. Raising the cap does not raise your dollar budget.
2. The **LCS Employee Portal** Google Cloud project should keep its budget at about **$5**. Leave that budget in place. Do not remove it to “fix” a busy chat. A public link plus a missing budget is how a bill grows.

The script does not read your Gmail, Drive, calendar, or the portal spreadsheet. It does not save the conversation. The browser tab forgets the chat on refresh.

## 1. Open Apps Script as the company

1. Open [script.google.com](https://script.google.com/).
2. Sign in with your **legacycomputingservices.com** account. Do not use a personal Gmail account. The key and the deployment should belong to the company.

## 2. Create a new project

1. Click **New project**.
2. Name it `Legacy Computing Chat`. The name is at the top of the editor.
3. This is its own project. Do not paste this into the inquiry script that is tied to the portal spreadsheet.

## 3. Paste the script

1. In this repository, open `apps-script/chatbot.gs`.
2. Select all of it and copy.
3. In the Apps Script editor, select the sample `Code.gs` contents (the empty `myFunction`) and replace them with the paste.
4. Click **Save** (the disk icon).

## 4. Add the Script properties

1. Click the gear: **Project Settings**.
2. Scroll to **Script properties**.
3. Click **Add script property** for each row you need.

| Property | Required? | Value |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | The key from the next section. This is the secret. |
| `GEMINI_MODEL` | No | Leave this off to use `gemini-3.8-flash`. Add it only if you want a different Gemini model name. |
| `DAILY_LIMIT` | No | Leave this off to allow 300 requests per day. Use a whole number, such as `150`, if you want a lower cap. |

Click **Save script properties**.

You do not need to edit `CHAT_USAGE_DAY` or `CHAT_USAGE_COUNT`. The script writes those itself. Deleting those two properties resets today’s counter. It does not reset the Cloud budget.

## 5. Get the key from AI Studio

1. Open [Google AI Studio](https://aistudio.google.com/apikey) while you are still signed in to the company account.
2. Use the API key that belongs to the **LCS Employee Portal** Google Cloud project. If AI Studio asks you to create a key, create it in that project, not in a personal project.
3. Copy the key.
4. Paste it only into the `GEMINI_API_KEY` script property from the previous step.
5. Close the AI Studio tab when you are done. Do not put the key anywhere in the website repository.

If the LCS Employee Portal project does not show a billing budget, stop and confirm the about-$5 Cloud budget before you publish the chat. The daily cap is not a dollar limit.

## 6. Deploy the web app

1. Click **Deploy**, then **New deployment**.
2. Next to “Select type”, click the gear and choose **Web app**.
3. Description: `Homepage chat`.
4. **Execute as:** Me (your company account). That is what lets the script read the key. Visitors never see the key.
5. **Who has access:** Anyone. This must be Anyone, not “Anyone with a Google account.” The public homepage cannot pop a Google sign-in for every visitor.
6. Click **Deploy**.
7. Google will ask you to authorize the script. Review the request. It needs permission to connect to an external service (Gemini) and to read the script properties.
8. If Google shows “Google hasn’t verified this app”, that warning is about your own script. Click **Advanced**, then **Go to Legacy Computing Chat (unsafe)**, then **Allow**.
9. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/…/exec`. Use the `/exec` URL, not a `/dev` URL. The `/dev` URL only works for you.

## 7. Check the deployment before editing the site

Paste the `/exec` URL into a browser tab and press Enter. You should see:

```json
{"ok":true}
```

That only means the script is deployed. It does not prove the Gemini key is correct. The first real question on the website does that.

## 8. Turn the bubble on

1. Open `index.html` in the repository.
2. Near the top, find this line:

```html
window.LCS_CHAT_ENDPOINT = '';
```

3. Paste the `/exec` URL between the quotes. It should look like this, with your real URL:

```html
window.LCS_CHAT_ENDPOINT = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT/exec';
```

4. Save, and publish the site the same way you publish any other edit to the homepage. GitHub Pages updates from that file. Do not put the API key in this line. If the quotes are empty, the bubble stays hidden.

5. Open https://legacycomputingservices.com/ and hard-refresh. The shield button should sit at the bottom right. Ask a short question about a service. You should get a short answer. Ask it for a price that is not on the site, or for an appointment, and it should send you to the contact form.

## 9. Publish a script change later

Editing `chatbot.gs` in the Apps Script editor does not update the live web app until you redeploy.

1. **Deploy** → **Manage deployments**.
2. On the web app row, click the pencil.
3. Under **Version**, choose **New version**.
4. Click **Deploy**.

The `/exec` URL stays the same. You do not edit `index.html` again.

If you click **New deployment** instead, Google creates a second URL. The website keeps using the old one until you paste the new `/exec` URL into `window.LCS_CHAT_ENDPOINT`.

## Turn the bubble off

Clear the URL so the line is `window.LCS_CHAT_ENDPOINT = '';` again, then publish the site. The bubble disappears. The Apps Script deployment can stay. Anyone who saved the old `/exec` URL can still call it, and the daily cap still applies.

## If something is wrong

- **No bubble.** The endpoint line is empty, it is not a full `https://` URL, or the site has not updated yet. Check the line, publish, and hard-refresh.
- **The assistant says it is unavailable.** The key is missing, the model name is not one Gemini accepts, or Google refused the call. In Apps Script, open **Executions** and look at the failed run. Fix the script property, then redeploy a new version. Do not paste the key into the website to test it.
- **“Chat is busy right now.”** Today’s counter reached the daily cap. It resets at midnight Eastern. You can delete the `CHAT_USAGE_DAY` and `CHAT_USAGE_COUNT` script properties to reset the counter early. Leave the Cloud budget alone.
- **You changed the script and the site still behaves the old way.** Redeploy a **new version** (step 9). Saving the editor is not enough.
