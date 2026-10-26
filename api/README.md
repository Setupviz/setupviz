# SetupViz API

Python backend for SetupViz, built with FastAPI. Uses [uv](https://docs.astral.sh/uv/) for Python and dependencies.

## Run it

```bash
cd api
uv sync
uv run uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/health. Interactive docs are at http://127.0.0.1:8000/docs.

## Test it

```bash
uv run pytest
```

## Layout

| Path | What it is |
| --- | --- |
| `app/main.py` | The FastAPI app and its routes. |
| `tests/` | Tests, run with pytest. |
| `data/mice.json` | 14 mice with dimensions. 12 are in the shop, 2 are reference only. Double-check the dimensions before real use. |
