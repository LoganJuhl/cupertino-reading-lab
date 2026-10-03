#!/usr/bin/env python3
"""Independently rebuild the selected current release; compare installer bytes."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    current = json.loads((ROOT / "CURRENT.json").read_text())
    build = json.loads((ROOT / current["build"]).read_text())
    folder = ROOT / build["folder"]
    assert current["version"] == build["version"]
    before = {p.name: sha(p) for p in folder.iterdir() if p.is_file()}
    assert before == build["files"]
    with tempfile.TemporaryDirectory(prefix="cupertino-current-build-") as temp:
        dest = Path(temp)
        version_folder = Path(current["build"]).parent
        shutil.copytree(ROOT / version_folder, dest / version_folder,
                        ignore=shutil.ignore_patterns("theme", "evidence", "__pycache__", "*.zip"))
        shutil.copytree(ROOT / "licenses", dest / "licenses")
        proc = subprocess.run([sys.executable, str(dest / current["buildScript"])],
                              capture_output=True, text=True, check=True)
        after = {p.name: sha(p) for p in (dest / build["folder"]).iterdir() if p.is_file()}
        assert before == after, "Independent build changed output"
    evidence = ROOT / "updates" / current["version"] / "evidence"
    evidence.mkdir(exist_ok=True)
    record = {"status": "PASS", "version": current["version"], "cssSha256": build["cssSha256"],
              "independentBuildExitCode": proc.returncode, "files": before,
              "buildScriptSha256": sha(ROOT / current["buildScript"])}
    (evidence / "BUILD-CHECK.json").write_text(json.dumps(record, indent=2)+"\n")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
