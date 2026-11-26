-- D1 schema for short share links and the public setups gallery.
-- Apply once: npx wrangler d1 execute setupviz --remote --file=schema.sql
-- A row holds only a share code (catalog products, positions, desk size and the
-- grip/hand/use answers), never anything a visitor typed or anything about them.
CREATE TABLE IF NOT EXISTS setups (
  id TEXT PRIMARY KEY,            -- 8 characters, derived from the code, so one row per setup
  code TEXT NOT NULL UNIQUE,      -- the same code a long /share?s= link carries
  desk_w REAL NOT NULL,           -- millimetres, for the gallery's desk-size filter
  desk_d REAL NOT NULL,
  created INTEGER NOT NULL,       -- ms since epoch
  published INTEGER NOT NULL DEFAULT 0,  -- 0 = link only, else when it joined the gallery
  votes INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS setups_top ON setups (published, votes DESC);
CREATE INDEX IF NOT EXISTS setups_new ON setups (published DESC);
