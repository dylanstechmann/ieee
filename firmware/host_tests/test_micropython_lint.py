import os
import pathlib
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import micropython_lint  # noqa: E402


class LintTests(unittest.TestCase):
    def test_firmware_is_clean(self):
        self.assertEqual(micropython_lint.lint(ROOT / "firmware" / "pico2"), [])

    def test_lint_catches_unsupported_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = pathlib.Path(tmp) / "bad.py"
            bad.write_text("import dataclasses\nimport machine\nimport math\nx = math.isclose(1, 1)\n", encoding="utf-8")
            problems = micropython_lint.lint(tmp)
        self.assertTrue(any("dataclasses" in p for p in problems))
        self.assertTrue(any("hardware layer" in p for p in problems))
        self.assertTrue(any("math.isclose" in p for p in problems))


if __name__ == "__main__":
    unittest.main()
