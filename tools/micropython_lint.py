"""Static checks that firmware/pico2 stays within what MicroPython on the RP2350 supports.

A conservative AST lint, not a MicroPython run: it rejects standard-library modules and functions that
MicroPython lacks or treats differently, `match` statements, and hardware imports outside the
hardware layer (so host tests can import every other module).

Usage: python -I tools/micropython_lint.py [FIRMWARE_DIR]
"""
import ast
import pathlib
import sys

ALLOWED_MODULES = {"array", "gc", "json", "machine", "math", "micropython", "os", "random", "rp2", "struct", "sys", "time", "_thread"}
HARDWARE_MODULES = {"machine", "rp2"}
HARDWARE_FILES = {"hal.py", "main.py"}
FORBIDDEN_ATTRIBUTES = {
    ("math", "isclose"), ("math", "tau"), ("math", "hypot"), ("math", "prod"), ("math", "dist"),
    ("random", "gauss"), ("random", "choices"), ("time", "monotonic"), ("time", "perf_counter"),
    ("time", "time_ns"), ("json", "dump"), ("os", "path"),
}


def local_modules(folder):
    return {p.stem for p in folder.glob("*.py")}


def lint_file(path, local):
    problems = []
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    guarded = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Try) and any(isinstance(h.type, ast.Name) and h.type.id == "ImportError" for h in node.handlers):
            for inner in ast.walk(node):
                guarded.add(id(inner))
    for node in ast.walk(tree):
        names = []
        if isinstance(node, ast.Import):
            names = [a.name.split(".")[0] for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            names = [(node.module or "").split(".")[0]]
        for name in names:
            if name not in ALLOWED_MODULES and name not in local:
                problems.append(f"{path.name}:{node.lineno}: import of '{name}' is not available in MicroPython")
            if name in HARDWARE_MODULES and path.name not in HARDWARE_FILES and id(node) not in guarded:
                problems.append(f"{path.name}:{node.lineno}: '{name}' imported outside the hardware layer without an ImportError guard")
        if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and (node.value.id, node.attr) in FORBIDDEN_ATTRIBUTES:
            problems.append(f"{path.name}:{node.lineno}: {node.value.id}.{node.attr} is missing or different in MicroPython")
        if hasattr(ast, "Match") and isinstance(node, ast.Match):
            problems.append(f"{path.name}:{node.lineno}: match statements are not supported by MicroPython")
        if isinstance(node, (ast.ClassDef,)) and any(isinstance(b, ast.Name) and b.id in ("Enum", "NamedTuple", "Protocol") for b in node.bases):
            problems.append(f"{path.name}:{node.lineno}: {node.name} uses a typing/enum base class")
    return problems


def lint(folder):
    folder = pathlib.Path(folder)
    local = local_modules(folder)
    problems = []
    for path in sorted(folder.glob("*.py")):
        problems.extend(lint_file(path, local))
    return problems


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else str(pathlib.Path(__file__).resolve().parent.parent / "firmware" / "pico2")
    found = lint(target)
    print("\n".join(found) if found else f"MicroPython lint clean: {target}")
    sys.exit(1 if found else 0)
