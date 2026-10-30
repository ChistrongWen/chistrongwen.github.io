# Visitor Analytics — Chistrong Wen website

This update adds a **site-wide Umami Cloud tracking integration**, not a fake counter and not a public visitor listing. The original pages, CV, Geoid GIF reference, and Research Notes remain unchanged in content.

## Enable in 3 steps

1. Create/sign in at https://cloud.umami.is/ and add a website with domain `chistrongwen.github.io`. Keep analytics **private** (do not enable public Share URL).
2. Copy the **Website ID** from the site's tracking code (a UUID). Open `assets/analytics.js` and replace `PASTE_YOUR_UMAMI_WEBSITE_ID_HERE` with that ID. Do **not** paste a password or API key.
3. Upload all files/folders preserving directory structure to GitHub Pages, then visit your site. Data begins to collect **after** deployment and configuring the ID; it cannot recover historic visits automatically.

## What to view privately

- Dashboard: visitors, visits, page views, daily/hourly trend, referrers, pages.
- Geography: country, region and city; use **Boards → Add board → Design → World map** for a world map if supported in your plan/version.
- Breakdown/report: compare traffic to `/`, `/cv/`, `/notes/`, and individual notes; country/city filters.
- Visit duration: estimated, based on tracked events. Single-page visits may not contribute to time estimates. Do not equate it with actual reading time.
- Visit frequency: aggregate repeat visits/sessions are estimates, not reliable persistent identity.

## Files changed

- `assets/analytics.js`: **only place** to configure Website ID.
- `<script defer src=".../assets/analytics.js"></script>` added to `index.html`, `cv/index.html`, all `notes/*.html`, and new `privacy/index.html`.
- `privacy/index.html`: transparent privacy statement, linked in home page footer.

## Important

- GitHub Pages does not itself provide a programmable visitor-IP database to these static HTML pages. Do not embed personal API tokens, raw IP logs, or an admin password in a public GitHub repository.
- IP geolocation is approximate; VPNs, blockers and shared networks affect accuracy.
- Website ID is public in frontend HTML by design; it is NOT an authentication credential.
- If the user visits only one page, Umami's standard visit-duration estimate may undercount time.
- Check applicable privacy/consent laws and update the privacy statement as needed for your audience.
