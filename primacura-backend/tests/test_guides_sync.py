"""The apps' guide steps must match the backend CSV (their only source).

src/data/conditions.ts in the web and iOS apps is generated from
data/First_Aid_Dataset_Final.csv by scripts/generate-guides.mjs, which runs on
app start/build and on git commit. This catches anything that slipped past.
"""
import shutil
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
GENERATOR = REPO / "scripts" / "generate-guides.mjs"


@pytest.mark.skipif(shutil.which("node") is None or not GENERATOR.exists(),
                    reason="needs node and the full repository")
def test_app_guides_match_the_csv():
    result = subprocess.run(["node", str(GENERATOR), "--check"], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr + "\nFix: node scripts/generate-guides.mjs"
