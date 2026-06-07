"""
AI quiz-generation reliability harness.

Goal (dev request 2026-06-06): reproduce "AI tạo quiz lúc được lúc không" — find WHERE it
fails (document too long? prompt/too many questions? model returns empty? parse error? timeout?)
by hammering POST /api/quiz/generate with a controlled matrix of inputs and recording the
outcome of every call. Runs against the LIVE stack with the seeded `User1` account (no org →
the per-org quota check is skipped, so quota never interferes).

This is a DATA COLLECTOR first, a pass/fail test second:
  • Every attempt's {status, success, question_count, elapsed_s, message} is written to
    tests/_ai_report.json and printed as a table.
  • The baseline scenario (short doc, normal count, easy) is asserted to succeed on EVERY
    repetition — that is the exact "sometimes works, sometimes not" symptom, encoded as a test.

Spec 2.1 — AI quiz: language-matched, explanation mandatory, saved as draft.
Markers: wave1, user, api, ai, slow.
"""
import json
import os
import time
import io
import pathlib

import pytest
import requests

API_BASE = os.getenv("API_BASE_URL", "http://localhost:5000")
GEN_URL = f"{API_BASE}/api/quiz/generate"
REPORT_PATH = pathlib.Path(__file__).resolve().parent.parent / "_ai_report.json"

# A real Vietnamese paragraph block so the language-match + explanation rules are genuinely
# exercised (not lorem). One block ≈ 700 chars; we tile it to build longer documents.
VN_BLOCK = (
    "Mạng máy tính là một tập hợp các thiết bị tính toán được kết nối với nhau để chia sẻ "
    "tài nguyên và trao đổi dữ liệu. Mô hình OSI gồm bảy tầng: tầng vật lý, tầng liên kết dữ "
    "liệu, tầng mạng, tầng giao vận, tầng phiên, tầng trình diễn và tầng ứng dụng. Giao thức "
    "TCP cung cấp truyền dữ liệu tin cậy theo hướng kết nối, trong khi UDP truyền không kết nối "
    "và không bảo đảm thứ tự gói tin. Địa chỉ IP phiên bản 4 có độ dài 32 bit, còn IPv6 dài 128 "
    "bit nhằm giải quyết vấn đề cạn kiệt địa chỉ. Bộ định tuyến (router) hoạt động ở tầng mạng "
    "và chuyển tiếp gói tin dựa trên bảng định tuyến. Bộ chuyển mạch (switch) hoạt động ở tầng "
    "liên kết dữ liệu và chuyển khung dựa trên địa chỉ MAC. Hệ thống tên miền DNS phân giải tên "
    "miền dễ nhớ thành địa chỉ IP tương ứng để máy tính có thể định tuyến. "
)


def _doc(n_blocks: int) -> str:
    return (VN_BLOCK * n_blocks).strip()


def _login(username="User1", password="User@123") -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": username, "password": password},
        timeout=15,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    body = r.json()
    token = (body.get("data") or body).get("accessToken")
    assert token, f"No accessToken in login response: {body}"
    return token


def _generate(token: str, content: str, filename: str, count: str, difficulty: str):
    """One call to /api/quiz/generate via the TXT path. Returns a result record."""
    files = {"file": (filename, io.BytesIO(content.encode("utf-8")), "text/plain")}
    data = {"documentTitle": filename, "questionCount": count, "difficulty": difficulty}
    headers = {"Authorization": f"Bearer {token}"}
    t0 = time.time()
    rec = {
        "doc_chars": len(content), "count": count, "difficulty": difficulty,
        "status": None, "success": False, "questions": 0, "elapsed_s": 0.0,
        "message": "", "all_have_explanation": None,
    }
    try:
        # 10-min ceiling mirrors the FE 8-min timeout + gateway 10-min activity timeout.
        resp = requests.post(GEN_URL, headers=headers, files=files, data=data, timeout=600)
        rec["elapsed_s"] = round(time.time() - t0, 1)
        rec["status"] = resp.status_code
        body = resp.json() if resp.text else {}
        rec["success"] = bool(body.get("success"))
        rec["message"] = body.get("message", "")[:200]
        payload = body.get("data") or {}
        qs = payload.get("questions") or []
        rec["questions"] = len(qs)
        if qs:
            rec["all_have_explanation"] = all(
                bool((q.get("explanation") or "").strip()) for q in qs
            )
    except requests.exceptions.Timeout:
        rec["elapsed_s"] = round(time.time() - t0, 1)
        rec["status"] = "CLIENT_TIMEOUT"
        rec["message"] = "request exceeded 600s ceiling"
    except Exception as e:  # noqa: BLE001 — collector must not crash the whole run
        rec["elapsed_s"] = round(time.time() - t0, 1)
        rec["status"] = "EXCEPTION"
        rec["message"] = repr(e)[:200]
    return rec


# (label, n_blocks, count, difficulty, repetitions)
MATRIX = [
    ("baseline_short_normal_easy", 1, "normal", "easy", 3),   # intermittency baseline
    ("medium_normal_normal",       12, "normal", "normal", 2),  # ~8k chars
    ("long_normal_normal",         60, "normal", "normal", 1),  # ~42k chars — "doc too long"
    ("highcount_hard",             12, "more",   "hard",   1),  # 20-25 Qs — "prompt too complex"
]


@pytest.fixture(scope="module")
def token():
    return _login()


@pytest.fixture(scope="module")
def report():
    data = {"scenarios": []}
    yield data
    REPORT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n\n===== AI QUIZ RELIABILITY REPORT =====")
    print(f"(written to {REPORT_PATH})")
    for sc in data["scenarios"]:
        print(f"\n* {sc['label']}  ({sc['doc_chars']} chars, {sc['count']}/{sc['difficulty']})")
        for i, a in enumerate(sc["attempts"], 1):
            print(f"   #{i}: status={a['status']} success={a['success']} "
                  f"q={a['questions']} expl={a['all_have_explanation']} "
                  f"{a['elapsed_s']}s  {a['message']}")
    print("\n======================================\n")


@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.api
@pytest.mark.ai
@pytest.mark.slow
@pytest.mark.timeout(2400)
@pytest.mark.parametrize("label,n_blocks,count,difficulty,reps", MATRIX, ids=[m[0] for m in MATRIX])
def test_ai_generate_matrix(token, report, label, n_blocks, count, difficulty, reps):
    """Spec 2.1 — collect outcomes across doc length / question count / difficulty.

    Asserts every attempt of this scenario returns a usable quiz (success + ≥1 question).
    A flaky scenario fails HERE with the full per-attempt table, pinpointing the failing axis.
    """
    content = _doc(n_blocks)
    attempts = [_generate(token, content, f"{label}.txt", count, difficulty) for _ in range(reps)]
    report["scenarios"].append({
        "label": label, "doc_chars": len(content), "count": count,
        "difficulty": difficulty, "attempts": attempts,
    })

    # Surface server errors explicitly (these are real bugs, not model flakiness).
    server_errors = [a for a in attempts if a["status"] in (500, "EXCEPTION")]
    assert not server_errors, f"{label}: server error(s): {server_errors}"

    # The core symptom: every attempt must yield a usable quiz.
    bad = [a for a in attempts if not (a["success"] and a["questions"] >= 1)]
    assert not bad, f"{label}: {len(bad)}/{reps} attempts produced no usable quiz: {bad}"

    # Spec 2.1: AI explanations mandatory.
    no_expl = [a for a in attempts if a["all_have_explanation"] is False]
    assert not no_expl, f"{label}: attempts with missing explanations: {no_expl}"
