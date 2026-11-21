# Legacy Computing Services

Static website for **Legacy Computing Services LLC** (Bel Air / Harford County, Maryland), owned by Scott.

The page is plain HTML, Tailwind from a CDN, and vanilla JavaScript. There is no framework, build step, or backend. `index.html` is one page with hash-routed views (`#services`, `#estimator`, `#about`, `#contact`). Copy and prices live in `js/site-data.js`.

## Preview locally

Open `index.html` in a browser, or serve this folder:

```bash
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

How to edit prices, services, and the other lists is in [docs/editing.md](docs/editing.md).

## Employee portal

Staff tools are at [portal/](portal/) (`https://legacycomputingservices.com/portal/`). The page is a sign-in shell. It does not store customer data in this repository. Legacy Bowling Academy students, lessons, and billing live in that same portal, on the Academy tab. A discreet Employee Login link is in the site footer only. Links are relative, so they follow the custom domain. Do not change the `CNAME` file.

Scott’s setup steps are in [docs/portal-setup.md](docs/portal-setup.md). Until the Google Client ID is filled in, the portal shows a setup message and a sample-data preview.

## Homepage chat

A shield button at the bottom right can open a short assistant for questions about the company’s services. The Gemini API key is not in this repository. It stays in a Google Apps Script web app, and the homepage only stores that app’s public `/exec` URL in `window.LCS_CHAT_ENDPOINT` near the top of `index.html`. While that value is empty, the button is hidden. Setup is in [docs/chatbot-setup.md](docs/chatbot-setup.md).
