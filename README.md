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

## Shared code (`web/src/`)

The rules the pages and the Worker share are ES modules in `web/src/`, with imports that run one way:

| Module | What it holds |
| --- | --- |
| `catalog.js` | Product data and the ordered pick lists. Add or retire products here. |
| `desk.js` | Desk size limits, reading typed sizes, showing lengths. |
| `products.js` | Looking products up, and the words for categories and answers. |
| `links.js` | Paid links and the measurement-source note. |
| `geometry.js` | Rectangles, overhang and monitor stand outlines. |
| `fit.js` | Every fit rule: Fits, Tight or Won't fit. |
| `baseline.js` | The original recommender and layout, kept as the baseline the current rules are measured against. |
| `layout.js` | Where each piece goes on the desk. |
| `recommend.js`, `fix-swap.js` | Our picks for a person's answers and desk, and the one-swap fix. |
| `usage.js`, `share.js` | Desk area used, and share-link encoding. |
| `draw.js`, `client.js`, `setup-image.js` | Browser drawing, step counts and link copying, and setup pictures. |
| `entry-site.js`, `entry-desk.js` | Publish `window.SV`, `SVDesk` and `SVImage` for the pages. |

`scripts/bundle.mjs` turns an entry into one classic script without a third-party bundler. The build serves the bundles as `/data.js` and `/desk-size.js`, and the Worker and the tests run the same bundle. It accepts only plain named imports and `export function` / `export const`, and it fails the build on an import cycle.

## Build the site

```bash
cd web
npm install
npm run build
```
