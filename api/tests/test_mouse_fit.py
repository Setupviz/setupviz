import unittest

from fit.mouse_fit import (
    find_mouse,
    grip_score,
    load_mice,
    normalize,
    recommend,
    size_distance,
    target_size,
)

SMALL = {"name": "Tiny One", "length_mm": 115.0, "width_mm": 60.0, "height_mm": 37.0,
         "weight_g": 55, "shape": "symmetrical", "hump": "rear", "in_shop": True}
MEDIUM = {"name": "Mid Rider", "length_mm": 122.0, "width_mm": 63.0, "height_mm": 39.0,
          "weight_g": 65, "shape": "symmetrical", "hump": "rear", "in_shop": True}
LARGE = {"name": "Big Palm", "length_mm": 130.0, "width_mm": 68.0, "height_mm": 43.0,
         "weight_g": 90, "shape": "ergonomic", "hump": "rear", "in_shop": True}
OLD = {"name": "Old Classic", "length_mm": 122.0, "width_mm": 63.0, "height_mm": 39.0,
       "weight_g": 80, "shape": "symmetrical", "hump": "center", "in_shop": False}
MICE = [SMALL, MEDIUM, LARGE, OLD]


class TestLoadAndFind(unittest.TestCase):
    def test_load_mice_reads_the_json_file(self):
        mice = load_mice("data/mice.json")
        self.assertEqual(len(mice), 14)
        self.assertEqual(mice[0]["name"], "Logitech G Pro X Superlight")

    def test_normalize(self):
        self.assertEqual(normalize("G-Pro X Superlight"), "gproxsuperlight")

    def test_find_mouse_ignores_case_spaces_and_hyphens(self):
        self.assertIs(find_mouse(MICE, "midrider"), MEDIUM)
        self.assertIs(find_mouse(MICE, "BIG-palm"), LARGE)

    def test_find_mouse_matches_part_of_the_name(self):
        self.assertIs(find_mouse(MICE, "classic"), OLD)

    def test_find_mouse_returns_none_when_missing(self):
        self.assertIsNone(find_mouse(MICE, "unicorn"))


class TestTargetSize(unittest.TestCase):
    def test_too_small_grows(self):
        self.assertEqual(target_size(MEDIUM, "too small"), {"length_mm": 130.5, "width_mm": 67.4})

    def test_too_big_shrinks(self):
        self.assertEqual(target_size(MEDIUM, "too big"), {"length_mm": 113.5, "width_mm": 58.6})

    def test_just_right_stays(self):
        self.assertEqual(target_size(MEDIUM, "just right"), {"length_mm": 122.0, "width_mm": 63.0})

    def test_unknown_feel_raises(self):
        with self.assertRaises(ValueError):
            target_size(MEDIUM, "kinda weird")

    def test_does_not_change_the_mouse(self):
        before = dict(MEDIUM)
        target_size(MEDIUM, "too small")
        self.assertEqual(MEDIUM, before)


class TestGripScore(unittest.TestCase):
    def test_palm_likes_long_and_tall(self):
        self.assertEqual(grip_score(LARGE, "palm"), 2)
        self.assertEqual(grip_score(SMALL, "palm"), 0)

    def test_claw_likes_short_with_rear_hump(self):
        self.assertEqual(grip_score(MEDIUM, "claw"), 2)
        self.assertEqual(grip_score(OLD, "claw"), 1)

    def test_fingertip_likes_small_and_light(self):
        self.assertEqual(grip_score(SMALL, "fingertip"), 2)
        self.assertEqual(grip_score(LARGE, "fingertip"), 0)

    def test_hybrid(self):
        self.assertEqual(grip_score(MEDIUM, "hybrid"), 2)
        self.assertEqual(grip_score(SMALL, "hybrid"), 0)

    def test_unknown_grip_raises(self):
        with self.assertRaises(ValueError):
            grip_score(MEDIUM, "spider")


class TestSizeDistance(unittest.TestCase):
    def test_adds_both_differences(self):
        target = {"length_mm": 120.0, "width_mm": 65.0}
        self.assertEqual(size_distance(MEDIUM, target), 4.0)
        self.assertEqual(size_distance(LARGE, target), 13.0)


class TestRecommend(unittest.TestCase):
    def test_too_big_with_claw_prefers_smaller_rear_hump(self):
        picks = recommend(MICE, "big palm", "too big", "claw", n=2)
        self.assertEqual([p["name"] for p in picks], ["Mid Rider", "Tiny One"])

    def test_skips_current_and_not_in_shop(self):
        picks = recommend(MICE, "mid rider", "just right", "palm")
        names = [p["name"] for p in picks]
        self.assertNotIn("Mid Rider", names)
        self.assertNotIn("Old Classic", names)
        self.assertEqual(names, ["Big Palm", "Tiny One"])

    def test_reason_compares_to_current_mouse(self):
        picks = recommend(MICE, "mid rider", "just right", "palm", n=1)
        self.assertEqual(picks[0]["reason"], "+8.0 mm length, +5.0 mm width vs Mid Rider")

    def test_unknown_current_mouse_raises(self):
        with self.assertRaises(ValueError):
            recommend(MICE, "unicorn", "just right", "palm")


if __name__ == "__main__":
    unittest.main()
