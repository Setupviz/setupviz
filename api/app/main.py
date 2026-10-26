from fastapi import FastAPI

app = FastAPI(title="SetupViz API")


@app.get("/health")
def health():
    return {"status": "ok"}
