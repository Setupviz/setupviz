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

## Build the site

```bash
cd web
npm install
npm run build
```
