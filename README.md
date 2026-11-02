# vedantam.co

Personal site of Hrishikesh Vedantam. Plain HTML, CSS and a little JavaScript, served by GitHub Pages.

## Files

- `index.html` – the whole site
- `assets/style.css` – styles, with light and dark themes
- `assets/main.js` – theme toggle, scroll reveals, copy-email button, and the hero honeycomb animation
- `assets/img/` – logo mark, portraits, share card (`og-card.jpg`) and the 512px icon
- `CNAME` – custom domain for GitHub Pages (`vedantam.co`)
- `404.html`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `robots.txt`, `sitemap.xml`

## Preview locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Custom domain DNS

At the domain registrar for `vedantam.co`:

| Type  | Host | Value                |
|-------|------|----------------------|
| A     | @    | 185.199.108.153      |
| A     | @    | 185.199.109.153      |
| A     | @    | 185.199.110.153      |
| A     | @    | 185.199.111.153      |
| AAAA  | @    | 2606:50c0:8000::153  |
| AAAA  | @    | 2606:50c0:8001::153  |
| AAAA  | @    | 2606:50c0:8002::153  |
| AAAA  | @    | 2606:50c0:8003::153  |
| CNAME | www  | shiki992.github.io   |

Remove any existing A records or forwarding on `@` first. Once DNS resolves, turn on **Enforce HTTPS** under Settings → Pages.
