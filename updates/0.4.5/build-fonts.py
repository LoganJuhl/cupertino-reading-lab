#!/usr/bin/env python3
"""Reproduce static WOFF2 faces from the pinned, fully licensed upstream fonts.

Optional asset-maintenance step; normal theme builds use committed WOFF2 bytes.
Requires fonttools[woff]==4.60.2 and brotli==1.2.0. No network requests.
"""
from pathlib import Path
import hashlib
import json

import fontTools
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent
FONTS = ROOT / "fonts"
UPSTREAM = FONTS / "upstream"
FAMILY = "Cupertino Newsreader"
WEIGHTS = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert fontTools.__version__ == "4.60.2", "Use the pinned fonttools version"
    provenance = json.loads((UPSTREAM / "PROVENANCE.json").read_text())
    for entry in provenance["files"]:
        assert sha(UPSTREAM / entry["file"]) == entry["sha256"], entry["file"]
    records = []
    for italic in (False, True):
        source = UPSTREAM / ("Newsreader-Italic[opsz,wght].ttf" if italic else "Newsreader[opsz,wght].ttf")
        for weight, label in WEIGHTS.items():
            original = TTFont(source, recalcTimestamp=False)
            cmap = original.getBestCmap()
            font = instantiateVariableFont(original, {"opsz": 24, "wght": weight}, inplace=False)
            assert "fvar" not in font and "gvar" not in font
            assert font.getBestCmap() == cmap, "Do not subset supported characters"
            style = "Italic" if italic and weight == 400 else label + ("Italic" if italic else "")
            display_style = "Italic" if italic and weight == 400 else label + (" Italic" if italic else "")
            ps_name = "CupertinoNewsreader24pt-" + style
            for name_id, value in {
                1: FAMILY, 2: display_style, 3: f"CupertinoReader-0.4.2-{ps_name}",
                4: f"{FAMILY} {display_style}", 6: ps_name, 16: FAMILY, 17: display_style,
            }.items():
                for item in font["name"].names:
                    if item.nameID == name_id:
                        item.string = value.encode(item.getEncoding())
                font["name"].setName(value, name_id, 3, 1, 0x409)
            font.recalcTimestamp = False
            font.flavor = "woff2"
            target = FONTS / (ps_name + ".woff2")
            font.save(target)
            check = TTFont(target, recalcTimestamp=False)
            assert check["OS/2"].usWeightClass == weight
            assert len(check.getBestCmap()) == 564
            assert "fvar" not in check
            records.append({"file": target.name, "weight": weight, "style": "italic" if italic else "normal",
                            "opticalSize": 24, "bytes": target.stat().st_size, "sha256": sha(target),
                            "glyphCodepoints": len(cmap), "source": source.name, "sourceSha256": sha(source)})
    record = {"family": FAMILY, "fonttools": fontTools.__version__, "upstreamCommit": provenance["commit"],
              "license": "SIL Open Font License 1.1; upstream/OFL.txt", "subset": False,
              "axesFrozen": {"opsz": 24, "wght": list(WEIGHTS)}, "faces": records}
    (FONTS / "PROVENANCE.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps({"faces": len(records), "woff2Bytes": sum(r["bytes"] for r in records), "glyphCodepointsPerFace": 564}))


if __name__ == "__main__":
    main()
