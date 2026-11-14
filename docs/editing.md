# Editing the Legacy Computing Services site

This is a static site. There is no build step and no server. Open `index.html` in a browser, or from the repo root run:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000. Hash routes also work on a fresh load, for example http://localhost:8000/#estimator/web-starter.

## Where things live

| Path | What it is |
| --- | --- |
| `index.html` | Layout only: header, the five views, footer, form shell, and HTML templates. |
| `js/site-data.js` | All editable copy: services, prices, ranges, process steps, towns, and the contact categories. |
| `js/app.js` | Hash router (`switchView` / `routeFromHash`), the estimator, and the contact form. |
| `assets/logo-shield.svg` | The shield used in the header, hero, and footer. |
| `assets/icons/` | Favicon and the Open Graph image. |

## Change a price or a tier

In `js/site-data.js`, each estimator tier has:

- `price` — the starting figure, such as `$750+`
- `budgetHint` — the range loaded into the contact form, such as `$750–$1,200 • Launch in 1–2 weeks`

The estimator shows the text before the `•` as the public range. Keep `price` and `budgetHint` in agreement. Do not add a new dollar amount without confirming it.

`startHere: true` marks the tier the “Not sure?” note points at. One tier per category.

`formValue` is the service name that goes in the email subject. Diagnostics and the NVMe upgrade must stay different.

## Change other content

Still in `js/site-data.js`:

- Services and the deliverable lists are `services` and each tier’s `deliverables`.
- The four principles are `principles`. The four steps are `process`.
- Towns are `serviceArea.towns`. The heading and footer sentence are the other `serviceArea` fields.

Views are `home`, `services`, `estimator`, `about`, and `contact`. A tier opens directly as `#estimator/pc-office`. Loading that tier into the form opens `#contact/pc-office`.

## Contact form

Submit does not post anywhere. It opens the visitor’s email app with a message to `info@legacycomputingservices.com`. The subject starts with `Consultation Request:` and includes the service category. Nothing is sent until they press Send.

## Before you publish

Search this repo for `TODO(owner)`. Those notes are decisions Scott still needs to confirm.
