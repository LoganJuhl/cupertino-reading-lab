#!/usr/bin/env python3
"""Build the owned source and export the installable default-branch files."""
from pathlib import Path
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def update_versions(file, version, minimum):
    assert not file.is_symlink(), "Refuse output symlink: versions.json"
    versions = json.loads(file.read_text()) if file.exists() else {}
    assert isinstance(versions, dict) and all(isinstance(v, str) for v in versions.values()), "Invalid compatibility history"
    versions[version] = minimum
    file.write_text(json.dumps(versions, indent=2) + "\n")


def main():
    current = json.loads((ROOT / "CURRENT.json").read_text())
    subprocess.run([sys.executable, str(ROOT / current["buildScript"])], check=True, cwd=ROOT)
    build = json.loads((ROOT / current["build"]).read_text())
    folder = ROOT / build["folder"]
    for name in ["theme.css", "manifest.json", "LICENSE"]:
        target = ROOT / name
        assert not target.is_symlink(), f"Refuse output symlink: {name}"
        target.write_bytes((folder / name).read_bytes())
    update_versions(ROOT / "versions.json", current["version"], build["minAppVersion"])
    print(json.dumps({"status": "PASS", "version": current["version"], "cssSha256": build["cssSha256"]}))


if __name__ == "__main__":
    main()
