"""Guard: journeys must be real user actions - no sleeps, API shortcuts, injected state or silent guards."""
import re
from pathlib import Path

import pytest

BANNED = [
    r"time\.sleep", r"wait_for_timeout", r"import requests", r"requests\.", r"localStorage",
    r"add_init_script", r"storage_state", r"\.evaluate\(", r"force\s*=\s*True", r"page\.route\(",
    r"\bexcept\b", r"pytest\.skip\(", r"xfail",
]
IF_BANNED = [r"is_visible\(", r"\.count\("]
HERE = Path(__file__).parent


@pytest.mark.journey
def test_journeys_contain_no_banned_patterns():
    """Rule 4 (workflow.md): Playwright tests must be real user actions."""
    bad = []
    for f in HERE.glob("*.py"):
        if f.name == Path(__file__).name:
            continue
        for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            for p in BANNED:
                if re.search(p, line):
                    bad.append(f"{f.name}:{n} {p}: {line.strip()}")
            if re.search(r"\bif\b", line):
                for p in IF_BANNED:
                    if re.search(p, line):
                        bad.append(f"{f.name}:{n} if+{p}: {line.strip()}")
    assert not bad, "banned patterns:\n" + "\n".join(bad)
