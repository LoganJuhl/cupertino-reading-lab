#!/usr/bin/env python3
"""Small offline regressions for release history and evidence gates."""
from pathlib import Path
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parent


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build = load("build-public")
package = load("package-current")
public = load("check-public")


class MaintenanceTests(unittest.TestCase):
    def test_notices_and_attribution_reject_removed_text(self):
        source = SCRIPTS.parent
        current = json.loads((source / "CURRENT.json").read_text())
        required = ["theme.css", "LICENSE", "CURRENT.json", "README.md",
                    "licenses/Reading-Lab-MIT.txt", "licenses/Minimal-MIT.txt",
                    "licenses/Lucide-LICENSE.txt", "licenses/Cupertino-MIT.txt",
                    f"updates/{current['version']}/fonts/upstream/OFL.txt",
                    "docs/CUPERTINO-AUTHOR-OUTREACH.md", "UPSTREAM.md",
                    "THIRD_PARTY_NOTICES.md", "docs/AUTHOR-REVIEW-READINESS.md"]
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for relative in required:
                target = root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source / relative, target)
            with patch.object(public, "ROOT", root):
                public.check_notices()
                css = root / "theme.css"
                original = css.read_text()
                upstream = (root / "licenses/Cupertino-MIT.txt").read_text().strip()
                permission = upstream[upstream.index("Permission is hereby granted"):]
                self.assertIn(permission, original)
                css.write_text(original.replace(permission, ""))
                with self.assertRaises(AssertionError):
                    public.check_notices()
                css.write_text(original)
                readme = root / "README.md"
                original = readme.read_text()
                self.assertIn(public.ATTRIBUTION, original)
                readme.write_text(original.replace(public.ATTRIBUTION, "Attribution removed for this negative test."))
                with self.assertRaisesRegex(AssertionError, "Missing required attribution: README.md"):
                    public.check_notices()

    def test_history_survives_new_release_and_current_correction(self):
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / "versions.json"
            file.write_text('{"0.4.5":"1.13.4"}')
            build.update_versions(file, "0.4.6", "1.13.5")
            build.update_versions(file, "0.4.6", "1.13.6")
            self.assertEqual(json.loads(file.read_text()), {"0.4.5": "1.13.4", "0.4.6": "1.13.6"})

    def test_publication_rejects_stale_inputs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            release = root / "release"
            capture = release / "publication"
            capture.mkdir(parents=True)
            script = release / "capture-publication.cjs"
            script.write_text("synthetic capture harness")
            identity = root / "identity.json"
            identity.write_text(json.dumps({"run_id": "test", "version": "1.13.7", "electron_version": "39.8.3"}))
            images = []
            for name, tone in [("screenshot.png", "light"), ("screenshot-dark.png", "dark")]:
                (capture / name).write_bytes(b"synthetic image bytes " + tone.encode())
                shutil.copyfile(capture / name, root / name)
                images.append({"file": name, "tone": tone, "sha256": package.sha(root / name), "toneState": {"cssSha256": "current", "actualTone": tone}})
            data = {"status": "PASS", "cssSha256": "current", "scriptSha256": package.sha(script), "runtimeIdentitySha256": package.sha(identity), "runId": "test", "runtime": {"appVersion": "1.13.7", "electron": "39.8.3"}, "screenshots": images}
            report = capture / "CAPTURE.json"
            report.write_text(json.dumps(data))
            with patch.object(package, "ROOT", root):
                package.validate_publication(release, "current", identity)
                for key in ["cssSha256", "scriptSha256", "runtimeIdentitySha256", "runId"]:
                    with self.subTest(key=key):
                        report.write_text(json.dumps({**data, key: "stale"}))
                        with self.assertRaises(AssertionError):
                            package.validate_publication(release, "current", identity)
                report.write_text(json.dumps(data))
                for image in images:
                    file = root / image["file"]
                    saved = file.read_bytes()
                    file.write_bytes(b"stale public image")
                    with self.subTest(image=file.name), self.assertRaises(AssertionError):
                        package.validate_publication(release, "current", identity)
                    file.write_bytes(saved)

    def test_package_stops_on_public_gate_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "CURRENT.json").write_text('{"version":"0.4.5","name":"test","build":"BUILD.json"}')
            (root / "BUILD.json").write_text('{"version":"0.4.5","name":"test"}')
            def run(command, **kwargs):
                if command[-1].endswith("check-public.py"):
                    raise subprocess.CalledProcessError(1, command)
            with patch.object(package, "ROOT", root), patch.object(sys, "argv", ["package-current.py", "--candidate"]), patch.object(package.subprocess, "run", side_effect=run) as mocked:
                with self.assertRaises(subprocess.CalledProcessError):
                    package.main()
                self.assertEqual(len(mocked.call_args_list), 3)
                self.assertFalse((root / "updates").exists())

    def test_runner_honors_evidence_override(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            scripts = root / "scripts"
            scripts.mkdir()
            shutil.copyfile(SCRIPTS / "run-suite.py", scripts / "run-suite.py")
            (scripts / "check-current-build.py").write_text('print("synthetic successful check")\n')
            target = root / "custom-evidence"
            subprocess.run([sys.executable, str(scripts / "run-suite.py"), "build"], cwd=tempfile.gettempdir(), env={**os.environ, "QA_EVIDENCE": "custom-evidence"}, check=True, capture_output=True)
            self.assertEqual(json.loads((target / "logs/build.json").read_text())["exitCode"], 0)
            self.assertIn("synthetic successful check", (target / "logs/build.stdout.txt").read_text())
            self.assertFalse((root / "evidence").exists())


if __name__ == "__main__":
    unittest.main()
