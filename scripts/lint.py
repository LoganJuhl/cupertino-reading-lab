#!/usr/bin/env python3
"""Lint every current authored CSS file and compiled output with the official config."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def parse_diagnostics(stdout, stderr):
    # Stylelint 17 writes JSON diagnostics to stderr, including on success.
    for stream in (stdout, stderr):
        try:
            data = json.loads(stream)
        except ValueError:
            continue
        if isinstance(data, list) and all(isinstance(item, dict) and "warnings" in item for item in data):
            return data
    raise RuntimeError("Stylelint returned no parseable JSON diagnostic array; inspect retained streams")



def current_release():
    """The release gate requires zero errors; inherited errors are not waived."""
    current = json.loads((ROOT / "CURRENT.json").read_text())
    build = json.loads((ROOT / current["build"]).read_text())
    assert build["version"] == current["version"] and build["name"] == current["name"]
    modules = next((p for p in [ROOT / "node_modules", ROOT / "work/lint/node_modules"]
                    if (p / "stylelint/bin/stylelint.mjs").is_file()), None)
    assert modules, "Run npm ci for the pinned official lint dependencies"
    node = shutil.which("node")
    assert node
    source = sorted((ROOT / current["source"]).glob("*.css"))
    output = ROOT / build["folder"] / "theme.css"
    assert digest(output) == build["cssSha256"]
    files = source + [output]
    command = [node, str(modules / "stylelint/bin/stylelint.mjs"), *map(str, files),
               "--config", str(ROOT / "stylelint.config.mjs"), "--formatter", "json"]
    proc = subprocess.run(command, capture_output=True, text=True)
    evidence = ROOT / "updates" / current["version"] / "evidence"
    evidence.mkdir(exist_ok=True)
    for stream, value in [("stdout", proc.stdout), ("stderr", proc.stderr)]:
        (evidence / f"lint.{stream}.json").write_text(value)
    results = parse_diagnostics(proc.stdout, proc.stderr)
    assert {Path(r["source"]) for r in results} == set(files), "Incomplete lint file coverage"
    failures = []
    summary = []
    for result in results:
        errors = [w for w in result["warnings"] if w["severity"] == "error"]
        warnings = [w for w in result["warnings"] if w["severity"] == "warning"]
        if errors or result.get("parseErrors") or result.get("invalidOptionWarnings") or result.get("ignored"):
            failures.append(result["source"])
        summary.append({"file": str(Path(result["source"]).relative_to(ROOT)),
                        "errors": len(errors), "warnings": len(warnings)})
    resolved_command = [node, str(modules / "stylelint/bin/stylelint.mjs"), "--print-config", str(output),
                        "--config", str(ROOT / "stylelint.config.mjs")]
    resolved = subprocess.run(resolved_command, capture_output=True, text=True, check=True)
    (evidence / "LINT-RESOLVED-CONFIG.json").write_text(resolved.stdout)
    record = {"status": "FAIL" if failures or proc.returncode else "PASS WITH WARNINGS" if any(s["warnings"] for s in summary) else "PASS",
              "version": current["version"], "cssSha256": build["cssSha256"], "command": command,
              "exitCode": proc.returncode, "configSha256": digest(ROOT / "stylelint.config.mjs"),
              "stylelint": json.loads((modules / "stylelint/package.json").read_text())["version"],
              "officialConfig": json.loads((modules / "stylelint-config-obsidianmd/package.json").read_text())["version"],
              "summary": summary, "failures": failures,
              "policy": "Zero-error gate. See stylelint.config.mjs and source normalization notes for enumerated external names, mobile fallback and preserved-cascade exceptions. All important/has/browser warnings remain visible."}
    write_json(evidence / "LINT.json", record)
    print(json.dumps(record, indent=2))
    if failures or proc.returncode:
        raise SystemExit(1)



if __name__ == "__main__":
    current_release()
