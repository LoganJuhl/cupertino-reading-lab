#!/usr/bin/env python3
"""Package the exact current installer after fresh build/lint and evidence gates.

--candidate permits a private device-test installer while physical acceptance is
incomplete. It never labels that candidate production ready or publishes it.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import stat
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = {"theme.css", "manifest.json", "README.md", "LICENSE"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_theme(folder, build):
    assert folder.is_dir() and not folder.is_symlink()
    assert {p.name for p in folder.iterdir()} == FILES, "Unexpected installer content"
    for p in folder.iterdir():
        assert stat.S_ISREG(p.lstat().st_mode), "Installer files must not be links"
        assert sha(p) == build["files"][p.name], "Stale installer file: " + p.name
    manifest = json.loads((folder / "manifest.json").read_text())
    for key in ["name", "version", "minAppVersion"]:
        assert manifest[key] == build[key]
    css = (folder / "theme.css").read_text()
    assert "MIT License" in css and "SIL OPEN FONT LICENSE Version 1.1" in css
    return {folder.name + "/" + name: sha(folder / name) for name in sorted(FILES)}


def validate_extra(evidence, name, script, css_sha, count):
    report = evidence / name / "RESULTS.json"
    data = json.loads(report.read_text())
    assert data["status"] == "PASS" and not data.get("errors"), name + " did not pass"
    assert data["cssSha256"] == css_sha, name + " used different CSS"
    assert data["scriptSha256"] == sha(script), name + " script changed"
    assert len(data["cases"]) == count, name + " is incomplete"
    if "runtimeIdentitySha256" in data:
        assert data["runtimeIdentitySha256"] == sha(Path(os.environ.get("QA_WORK", str(ROOT / "work"))) / "app/QA-IDENTITY.json")
    def check_screenshots(value):
        if isinstance(value, dict):
            for asset in ["screenshot", "trace"]:
                if asset in value:
                    name = value[asset]
                    assert Path(name).name == name, "Evidence asset must be local to its evidence folder"
                    assert sha(report.parent / name) == value[asset + "Sha256"]
            for child in value.values():
                check_screenshots(child)
        elif isinstance(value, list):
            for child in value:
                check_screenshots(child)
    check_screenshots(data)
    return sha(report)


def validate_publication(release, css_sha, identity_path):
    report = release / "publication/CAPTURE.json"
    data = json.loads(report.read_text())
    identity = json.loads(identity_path.read_text())
    assert data["status"] == "PASS", "Publication capture did not pass"
    assert data["cssSha256"] == css_sha, "Publication capture used different CSS"
    assert data["scriptSha256"] == sha(release / "capture-publication.cjs"), "Publication capture script changed"
    assert data["runtimeIdentitySha256"] == sha(identity_path), "Publication runtime identity changed"
    assert data["runId"] == identity["run_id"], "Publication capture belongs to another QA run"
    assert data["runtime"]["appVersion"] == identity["version"]
    assert data["runtime"]["electron"] == identity["electron_version"]
    expected = {"screenshot.png": "light", "screenshot-dark.png": "dark"}
    assert len(data["screenshots"]) == 2 and {s["file"] for s in data["screenshots"]} == set(expected), "Publication requires both current images"
    for image in data["screenshots"]:
        name = image["file"]
        assert image["tone"] == expected[name]
        assert image["toneState"]["cssSha256"] == css_sha
        assert image["toneState"]["actualTone"] == expected[name]
        assert sha(report.parent / name) == image["sha256"], "Changed publication capture: " + name
        assert sha(ROOT / name) == image["sha256"], "Stale public image: " + name
    return sha(report)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", action="store_true", help="Private installer; device acceptance may remain incomplete")
    args = parser.parse_args()
    current = json.loads((ROOT / "CURRENT.json").read_text())
    release = ROOT / "updates" / current["version"]
    build = json.loads((ROOT / current["build"]).read_text())
    assert build["version"] == current["version"] and build["name"] == current["name"]
    for script in ["check-current-build.py", "lint.py", "check-public.py"]:
        subprocess.run([sys.executable, str(ROOT / "scripts" / script)], cwd=ROOT, check=True)
    subprocess.run([os.environ.get("QA_NODE", "node"), str(ROOT / "scripts/check-evidence.cjs")], cwd=ROOT, check=True)
    evidence = release / "evidence"
    core_evidence = (ROOT / Path(os.environ.get("QA_EVIDENCE", "evidence"))).resolve()
    identity_path = Path(os.environ.get("QA_WORK", str(ROOT / "work"))) / "app/QA-IDENTITY.json"
    publication_sha = validate_publication(release, build["cssSha256"], identity_path)
    extra = {}
    for name, script, count in [("normalization", "check-normalization.cjs", 24),
                                 ("fonts", "check-font.cjs", 18),
                                 ("webkit-font", "check-webkit-font.cjs", 4),
                                 ("controls", "check-controls.cjs", 4),
                                 ("settings", "check-settings.cjs", 20),
                                 ("panes", "check-panes.cjs", 216),
                                 ("wide", "check-wide.cjs", 178),
                                 ("wide-webkit", "check-wide-webkit.cjs", 32),
                                 ("wide-scroll", "check-wide-scroll.cjs", 8),
                                 ("math-scroll", "check-math-scroll.cjs", 32),
                                 ("math-webkit", "check-math-webkit.cjs", 32),
                                 ("ui", "check-ui.cjs", 4),
                                 ("dataview", "check-dataview.cjs", 32)]:
        extra[name] = validate_extra(evidence, name, release / script, build["cssSha256"], count)
    for name in ["wide", "dataview"]:
        data = json.loads((evidence / name / "RESULTS.json").read_text())
        assert data["fixtureSha256"] == sha(release / "wide-fixture.cjs"), "Wide fixture changed"
    assert json.loads((evidence / "dataview/RESULTS.json").read_text())["pluginDisabled"], "Test plugin remains enabled"
    math = json.loads((evidence / "math-scroll/RESULTS.json").read_text())
    assert math["fixtureSha256"] == sha(release / "math-fixture.cjs"), "Math fixture changed"
    assert math["configSha256"] == sha(ROOT / "scripts/config.cjs"), "Math harness changed"
    assert {(c["width"], c["tone"], c["mode"], c["variant"]) for c in math["cases"]} == {
        (w, t, m, v) for w in [390, 430, 844, 1280] for t in ["light", "dark"]
        for m in ["reading", "live"] for v in ["before", "after"]
    }, "Missing math lifecycle matrix case"
    assert all(c["cycles"] == len(c["cycleObservations"]) == 10 and c["frameCount"] > 30 for c in math["cases"])
    assert all(not o["away"]["inView"] and o["returned"]["fullyInView"] and o["navigationDelta"] > 100
               for c in math["cases"] for o in c["cycleObservations"]), "Unobserved math scroll cycle"
    assert {(c["width"], c["tone"]) for c in math["matchedControls"]} == {
        (w, t) for w in [390, 430] for t in ["light", "dark"]
    }
    assert all(c["reproduced"] and c["contained"] for c in math["matchedControls"])
    browsers = json.loads((evidence / "math-webkit/RESULTS.json").read_text())
    assert {(c["engine"], c["width"], c["tone"], c["state"]) for c in browsers["cases"]} == {
        (e, w, t, s) for e in ["chromium", "webkit"] for w in [390, 430, 844, 1280]
        for t in ["light", "dark"] for s in ["before", "after"]
    }, "Missing browser math matrix case"
    settings = json.loads((evidence / "settings/RESULTS.json").read_text())
    assert len(settings["webkit"]) == 8, "WebKit settings coverage is incomplete"
    assert sum(bool(c.get("manageOpened", {}).get("modalVisible")) for c in settings["cases"]) == 2
    assert {(c["width"], c["tone"], c["family"]) for c in settings["cases"]} == {
        (w, t, f) for w in [320, 375, 390, 430, 932]
        for t in ["light", "dark"] for f in ["", "Times New Roman"]
    }, "Missing settings matrix case"
    device_path = evidence / "IPHONE-ACCEPTANCE.json"
    device = json.loads(device_path.read_text()) if device_path.exists() else {"status": "INCOMPLETE"}
    device_passed = (device.get("status") == "PASS" and device.get("cssSha256") == build["cssSha256"]
                     and all(device.get(k) for k in ["device", "appVersion", "iosVersion", "observedAt", "observations"]))
    if not args.candidate:
        assert device_passed, "Physical iPhone acceptance for this CSS is incomplete; use --candidate only for private testing"
    folder = ROOT / build["folder"]
    expected = validate_theme(folder, build)
    suffix = "-candidate" if args.candidate else ""
    target = release / ("Cupertino-Reading-Lab-v4-" + current["version"] + suffix + "-install.zip")
    temporary = target.with_suffix(".zip.tmp")
    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(FILES):
            entry = zipfile.ZipInfo(folder.name + "/" + name, (2026, 9, 20, 0, 0, 0))
            entry.external_attr = 0o100644 << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, (folder / name).read_bytes(), compresslevel=9)
    with zipfile.ZipFile(temporary) as archive:
        assert len(archive.namelist()) == 4 and set(archive.namelist()) == set(expected)
        for name, digest in expected.items():
            assert hashlib.sha256(archive.read(name)).hexdigest() == digest
    if target.exists():
        assert sha(temporary) == sha(target), "Refuse to replace an existing different release archive"
        temporary.unlink()
    else:
        temporary.rename(target)
    record = {"status": "PRIVATE CANDIDATE" if args.candidate else "TECHNICAL RELEASE PACKAGE",
              "version": current["version"], "cssSha256": build["cssSha256"],
              "physicalIphone": "PASS" if device_passed else "INCOMPLETE",
              "installer": target.name, "bytes": target.stat().st_size, "sha256": sha(target),
              "files": expected, "extraEvidence": extra,
              "coreEvidenceSha256": sha(core_evidence / "EVIDENCE-GATE.json"),
              "publicationCaptureSha256": publication_sha,
              "buildCheckSha256": sha(evidence / "BUILD-CHECK.json"),
              "lintSha256": sha(evidence / "LINT.json"), "scriptSha256": sha(Path(__file__)),
              "publication": "Technical evidence only; no author/name approval or rights clearance implied. No commit, push, remote release or directory submission performed"}
    (release / "PACKAGE.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
