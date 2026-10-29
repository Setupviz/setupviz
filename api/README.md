# SetupViz API

SetupViz Python backend: the fit rules that decide whether a desk setup fits you, and later the API the website calls.

## Layout

| Path | What it is |
| --- | --- |
| `fit/mouse_fit.py` | Mouse fit recommender. Every function has a docstring saying what it must do; replace each `raise NotImplementedError`. |
| `tests/test_mouse_fit.py` | 20 tests. Make them all pass. Don't edit this file. |
| `data/mice.json` | 14 mice: 12 in the shop, 2 reference-only. Dimensions are approximate; double-check before real use. |

## Step 1: mouse fit recommender

A person says which mouse they use now, how it feels and their grip, and gets 3 mice from the shop, each with a reason. It only uses what you've done on boot.dev so far: Python basics, dictionaries and lists, pure functions and first-class functions (you'll want `sorted(..., key=...)`). No libraries to install.

Run everything from this `api` folder:

1. `python3 -m unittest discover tests -v`. Everything fails at first; that's expected.
2. Work top to bottom: `load_mice` → `normalize` → `find_mouse` → `target_size` → `grip_score` → `size_distance` → `recommend`. Re-run the tests after each one.
3. When all 20 pass, try it: `python3 -m fit.mouse_fit`.

## Rules for yourself

- Keep every function except `main()` **pure**: no `print`, no `input`, never change the dicts you're given. This is exactly the "Pure Functions" chapter you just finished.
- Stuck for more than 20 minutes on one function? Ask me for a **hint**, not the answer.
- Commit to git after each function passes (`git add . && git commit -m "find_mouse passes"`). Good habit, and it shows your progress on GitHub.

## Hints (read only if stuck)

**find_mouse:** normalize both the query and each name, then check `query in name`. Return the first match.

**grip_score:** a `True` counts as 1 when you add it, so `(length >= 123) + (height >= 40)` already gives 0, 1 or 2.

**recommend sorting:** `sorted(candidates, key=lambda m: (-grip_score(m, grip), size_distance(m, target), m["name"]))` sorts by three things at once. The minus sign makes higher scores come first.

## Bonus (optional)

- Add a `"left_handed"` question and skip ergonomic mice for lefties.
- If `find_mouse` returns `None`, append what they typed to `missing.txt`. That's the first version of your missing-products queue.

## What comes next

- After boot.dev's **SQL** course: move `mice.json` into a SQLite database.
- After **HTTP Clients**: turn `recommend` into a small web API.
- boot.dev's **Personal Project 1** in your path can be SetupViz itself.
