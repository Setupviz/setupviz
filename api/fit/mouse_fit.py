"""SetupViz exercise 1: recommend mice from the one you own now.

Fill in each function. Every function except main() should be PURE:
same input -> same output, no printing, no input(), no changing its arguments.
Run the tests from the setupviz-api folder:  python3 -m unittest discover tests -v
"""

import json

VALID_FEELS = ("too small", "just right", "too big")
VALID_GRIPS = ("palm", "claw", "fingertip", "hybrid")


def load_mice(path):
    """Read the JSON file at `path` and return the list of mouse dicts."""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def normalize(text):
    """Lowercase `text` and remove spaces and hyphens. "G-Pro X" -> "gprox"."""
    return text.lower().replace("-","").replace(" ","")


def find_mouse(mice, query):
    """Return the first mouse whose normalized name contains the normalized
    query, or None if nothing matches."""
    normal_query = normalize(query)
    for mouse in mice:
        normal_mouse = normalize(mouse["name"])
        if normal_query in normal_mouse:
            return mouse
    return None

def target_size(current, feel):
    """Return {"length_mm": ..., "width_mm": ...} for the size we aim for.

    "too small"  -> current size x 1.07
    "too big"    -> current size x 0.93
    "just right" -> current size x 1.0
    Round both values to 1 decimal. Raise ValueError for any other feel.
    """
    new_mouse_dict = {}
    if feel == "too small":
        new_mouse_dict["length_mm"] = round(current["length_mm"] * 1.07, 1)
        new_mouse_dict["width_mm"] = round(current["width_mm"] * 1.07, 1)
    elif feel == "too big":
        new_mouse_dict["length_mm"] = round(current["length_mm"] * 0.93, 1)
        new_mouse_dict["width_mm"] = round(current["width_mm"] * 0.93, 1)
    elif feel == "just right":
        new_mouse_dict["length_mm"] = round(current["length_mm"] * 1.0, 1)
        new_mouse_dict["width_mm"] = round(current["width_mm"] * 1.0, 1)
    else:
        raise ValueError(
            "Unknown feel 'kinda weird', choose too small, just right or too big"
        )
    return new_mouse_dict


def grip_score(mouse, grip):
    """Return 0, 1 or 2: how well the mouse's shape suits the grip.

    palm:      +1 if length_mm >= 123,        +1 if height_mm >= 40
    claw:      +1 if length_mm <= 125,        +1 if hump == "rear"
    fingertip: +1 if length_mm <= 120,        +1 if weight_g <= 60
    hybrid:    +1 if 118 <= length_mm <= 127, +1 if height_mm >= 38
    Raise ValueError for any other grip.
    """
    total = 0
    if grip == "palm":
        if mouse['length_mm'] >= 123:
            total += 1
        if mouse["height_mm"] >= 40:
            total += 1
    elif grip == "claw":
        if mouse["length_mm"] <= 125:
            total += 1
        if mouse["hump"] == "rear":
            total += 1
    elif grip == "fingertip":
        if mouse["length_mm"] <= 120:
            total += 1
        if mouse["weight_g"] <= 60:
            total += 1
    elif grip == "hybrid":
        if 118 <= mouse["length_mm"] <= 127:
            total += 1
        if mouse["height_mm"] >= 38:
            total += 1
    else:
        raise ValueError("Unknown grip style , choose too palm, claw, fingertip, hybrid")
    return total


def size_distance(mouse, target):
    """Return |length difference| + |width difference|, rounded to 1 decimal."""
    return round(abs(mouse['length_mm'] - target['length_mm']) + abs(mouse['width_mm'] - target['width_mm']), 1)


def recommend(mice, current_name, feel, grip, n=3):
    """Return up to n recommendations as dicts: {"name": ..., "reason": ...}.

    1. Find the current mouse with find_mouse. Raise ValueError if not found.
    2. Candidates: mice with in_shop == True, excluding the current mouse.
    3. Sort by: highest grip_score first, then smallest size_distance to
       target_size(current, feel), then name (A to Z).
    4. reason = f"{dl:+.1f} mm length, {dw:+.1f} mm width vs {current name}"
       where dl and dw are the candidate's size minus the current mouse's size.
    """
    current_mouse = find_mouse(mice, current_name)
    if not current_mouse:
        raise ValueError("Unkown Mouse, we will add it to out todo list to add this mouse.")
    candidates = list(filter(lambda x: x['in_shop'] and x != current_mouse, mice))
    target = target_size(current_mouse, feel)
    ranked = sorted(candidates, key=lambda mouse: (-grip_score(mouse, grip), size_distance(mouse, target), mouse['name']))


def main():
    """The only impure part: ask questions, print the picks."""
    mice = load_mice("data/mice.json")
    current = input("Which mouse do you use now? ")
    feel = input("How does it feel? (too small / just right / too big) ")
    grip = input("Your grip? (palm / claw / fingertip / hybrid) ")
    try:
        picks = recommend(mice, current, feel.strip().lower(), grip.strip().lower())
    except ValueError as err:
        print(f"Sorry: {err}")
        return
    print("\nTry these:")
    for i, pick in enumerate(picks, start=1):
        print(f"{i}. {pick['name']} ({pick['reason']})")


if __name__ == "__main__":
    main()
