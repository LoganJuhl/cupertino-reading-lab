#!/usr/bin/env python3
"""Run named validation suites sequentially and retain command/exit/raw output."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import os
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
allowed = {
    "lint": "lint.py", "build": "check-current-build.py", "css": "check-css.cjs",
    "layout": "check-layout.cjs", "surfaces": "check-surfaces.cjs",
    "focus": "check-focus.cjs", "interactions": "check-interactions.cjs",
    "newsreader": "check-newsreader.cjs", "accessibility": "check-accessibility.cjs",
    "editorial": "capture-editorial.cjs", "hierarchy": "capture-hierarchy.cjs",
    "evidence": "check-evidence.cjs",
}
parser = argparse.ArgumentParser()
parser.add_argument("suites", nargs="+", choices=sorted(allowed))
args = parser.parse_args()
out = (root / Path(os.environ.get("QA_EVIDENCE", "evidence"))).resolve()
logs = out / "logs"
logs.mkdir(parents=True, exist_ok=True)
for suite in args.suites:
    script = root / "scripts" / allowed[suite]
    executable = sys.executable if script.suffix == ".py" else os.environ.get("QA_NODE", "node")
    command = [executable, str(script)]
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    print(f"Starting {suite}", flush=True)
    record = {"suite": suite, "command": command, "startedAt": started,
              "scriptSha256": hashlib.sha256(script.read_bytes()).hexdigest()}
    with (logs / f"{suite}.stdout.txt").open("w") as stdout, (logs / f"{suite}.stderr.txt").open("w") as stderr:
        proc = subprocess.run(command, cwd=root, stdout=stdout, stderr=stderr)
    record.update(exitCode=proc.returncode, finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
    (logs / f"{suite}.json").write_text(json.dumps(record, indent=2) + "\n")
    print(f"{suite}: exit {proc.returncode}", flush=True)
    if proc.returncode:
        for stream in ["stdout", "stderr"]:
            print((logs / f"{suite}.{stream}.txt").read_text()[-6000:], flush=True)
        raise SystemExit(proc.returncode)
