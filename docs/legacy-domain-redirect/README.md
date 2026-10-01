# Revive the old `transemirateslivestock.netlify.app` links

On 1 Oct 2026 the Netlify site was renamed to `inspectpro-ae.netlify.app`.
Netlify does **not** redirect a renamed site, so every link that was already
sent — branch evidence links after an inspection, supplier questionnaires,
training quiz links, printed QR codes — now opens a Netlify 404.

The app itself is fixed (all new links use the live site, and an old stored
link is rewritten the next time QA copies or e-mails it). This folder fixes the
links that are **already in people's inboxes**.

## One-time setup (≈2 minutes, free)

1. Netlify → **Add new site → Deploy manually**.
2. Drag the `site` folder (this folder's `site/`, containing `_redirects` and
   `index.html`) onto the drop zone.
3. Site settings → **Change site name** → `transemirateslivestock`
   (the old name is free again after the rename).
4. Open any old link, e.g.
   `https://transemirateslivestock.netlify.app/inspection/evidence/iev_...` —
   it must jump to the same path on `inspectpro-ae.netlify.app`.

Tokens are unchanged, so the branch lands on its own evidence page.
Nothing else needs to change: CORS (`ALLOWED_ORIGINS`) only has to list the
site the app actually runs on, and the redirect site never calls the API.
