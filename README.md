# SetupViz

Plan your desk setup in 3D before you buy. Live at [setupviz.com](https://setupviz.com).

| Folder | What it is |
| --- | --- |
| [`web/`](web/) | The website, deployed as a Cloudflare Worker. |
| [`api/`](api/) | Python backend: fit rules that decide whether gear fits you, later the API the site calls. |

## Run the API tests

```bash
cd api
python3 -m unittest discover tests -v
```

## How `web/` is laid out

| Folder | What it holds |
| --- | --- |
| `pages/` | The hand-written pages, served at `/<name>` (`index.html` is `/home`). Each marks where its script goes with `<script data-page-script></script>`. |
| `styles/` | Stylesheets, served at the root (`/sv.css`, `/questions.css`). |
| `public/` | Images, favicons, `fonts/`, `robots.txt` and `sitemap.xml`, served at the same path. |
| `src/` | Shared code as ES modules, bundled for the pages and the Worker (below). |
| `worker/` | The Worker's own code: routing and headers (`router.js`), short links and the gallery (`setups.js`), Amazon prices (`prices.js`). |
| `scripts/` | Build (`build-worker.mjs`, `bundle.mjs`, `assemble-page.mjs`, the generated gear, fit and gallery pages), deploy, tests and browser checks. |

The build serves every file in `pages/`, `styles/` and `public/` without a hand-kept list, so adding an image is just adding the file.

### Shared code (`web/src/`)

Imports run one way: data, then rules, then layout and picks, then browser code.

| Module | What it holds |
| --- | --- |
| `catalog/monitors.js`, `keyboards.js`, `pads.js`, `mice.js` | The products, one per line. **Add or retire a product here.** |
| `catalog.js` | The catalog by category, and the ordered pick lists. |
| `desk.js` | Desk size limits, reading typed sizes, showing lengths. |
| `products.js` | Looking products up, and the words for categories and answers. |
| `links.js` | Paid links and the measurement-source note. |
| `geometry.js` | Rectangles, overhang and monitor stand outlines. |
| `fit.js` | Every fit rule: Fits, Tight or Won't fit. |
| `baseline.js` | The original recommender and layout, kept as the baseline the current rules are measured against. |
| `layout.js` | Where each piece goes on the desk. |
| `recommend.js`, `fix-swap.js` | Our picks for a person's answers and desk, and the one-swap fix. |
| `usage.js`, `share.js` | Desk area used, and share-link encoding. |
| `html.js`, `units.js`, `fit-words.js`, `product-text.js` | Escaping, lengths in the visitor's unit, the Fits/Tight/Won't fit colours and words, and product size lines. |
| `draw.js`, `client.js`, `setup-image.js`, `prices.js`, `setup-source.js` | Browser code: drawing pieces and monitors, step counts, link copying and the buy-all link, setup pictures, Amazon prices, and which setup a page shows (link, saved or our picks). |
| `api.js` | The `SV` and `SVImage` objects the pages use. |
| `entry-site.js`, `entry-desk.js`, `entry-prices.js` | Served as `/data.js`, `/desk-size.js` and `/prices.js`; they publish `window.SV`, `SVDesk`, `SVImage` and `SVPrices`. |
| `pages/builder.js`, `home.js`, `share.js`, `desk.js`, `questions.js` | Each page's script. `questions.js` serves the grip, hand and use pages. |

`scripts/bundle.mjs` turns an entry into one classic script without a third-party bundler. The Worker and the tests run the same site bundle. It accepts only plain named imports and `export function` / `export const`, and it fails the build on an import cycle. A page's script reads the modules `/data.js` (or `/desk-size.js`, `/prices.js`) already loaded instead of carrying a second copy.

`scripts/assemble-page.mjs` turns a page into what the Worker serves: it inlines the shared styles, and either inlines the page's script (share, desk, the questions) or loads it after the first frame (home, builder). `pageScripts` there says which script each page runs and how.

## Build the site

```bash
cd web
npm install
npm run build
```
