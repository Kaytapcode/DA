"""
Unified test runner for Tiny-LMS
Executes API tests, UI tests, and generates HTML report
"""

import subprocess
import time
import requests
import sys
from pathlib import Path
from datetime import datetime
import json


def wait_for_service(url: str, max_retries: int = 30, name: str = "Service") -> bool:
    """Wait for service to be ready"""
    for i in range(max_retries):
        try:
            response = requests.get(url, timeout=2)
            if response.status_code < 500:
                print(f"✓ {name} is running ({url})")
                return True
        except:
            if i < max_retries - 1:
                time.sleep(1)
    print(f"✗ {name} not responding ({url})")
    return False


def verify_services() -> bool:
    """Verify all required services are running"""
    print("\n" + "="*60)
    print("VERIFYING SERVICES")
    print("="*60)
    
    services = {
        "Gateway API": "http://localhost:5000/health",
        "Frontend": "http://localhost:5173",
    }
    
    all_ready = True
    for name, url in services.items():
        if not wait_for_service(url, name=name):
            all_ready = False
    
    if not all_ready:
        print("\n⚠️  Some services are not running. Please start them first:")
        print("   Backend: cd BE && dotnet run (for each service)")
        print("   Frontend: cd FE && npm run dev")
        return False
    
    return True


def run_api_tests() -> bool:
    """Run API test suite"""
    print("\n" + "="*60)
    print("RUNNING API TESTS")
    print("="*60)
    
    test_dir = Path(__file__).parent / "api"
    
    cmd = [
        "pytest",
        str(test_dir),
        "-v",
        "--tb=short",
        f"--html={Path(__file__).parent / 'reports' / 'api_report.html'}",
        "--self-contained-html",
        "-m", "api or auth",
        "--color=yes",
    ]
    
    result = subprocess.run(cmd, cwd=str(Path(__file__).parent.parent))
    return result.returncode == 0


def run_ui_tests() -> bool:
    """Run UI test suite (Playwright)"""
    print("\n" + "="*60)
    print("RUNNING UI TESTS")
    print("="*60)

    test_dir = Path(__file__).parent / "ui"

    if not test_dir.exists():
        print("⚠️  UI tests directory not found. Skipping UI tests.")
        return True

    cmd = [
        "pytest",
        str(test_dir),
        "-v",
        "--tb=short",
        f"--html={Path(__file__).parent / 'reports' / 'ui_report.html'}",
        "--self-contained-html",
        "--color=yes",
    ]

    result = subprocess.run(cmd, cwd=str(Path(__file__).parent.parent))
    return result.returncode == 0


def run_e2e_tests() -> bool:
    """Run E2E test suite (workflow tests)"""
    print("\n" + "="*60)
    print("RUNNING E2E TESTS")
    print("="*60)

    test_dir = Path(__file__).parent / "e2e"

    if not test_dir.exists():
        print("⚠️  E2E tests directory not found. Skipping E2E tests.")
        return True

    cmd = [
        "pytest",
        str(test_dir),
        "-v",
        "--tb=short",
        f"--html={Path(__file__).parent / 'reports' / 'e2e_report.html'}",
        "--self-contained-html",
        "-m", "e2e",
        "--color=yes",
    ]

    result = subprocess.run(cmd, cwd=str(Path(__file__).parent.parent))
    return result.returncode == 0


def run_katalon_tests() -> bool:
    """Run Katalon-ported tests (browser-recorded workflows)"""
    print("\n" + "="*60)
    print("RUNNING KATALON TESTS")
    print("="*60)

    test_dir = Path(__file__).parent / "katalon"

    if not test_dir.exists():
        print("⚠️  Katalon tests directory not found. Skipping Katalon tests.")
        return True

    cmd = [
        "pytest",
        str(test_dir),
        "-v",
        "--tb=short",
        f"--html={Path(__file__).parent / 'reports' / 'katalon_report.html'}",
        "--self-contained-html",
        "-m", "katalon",
        "--color=yes",
    ]

    result = subprocess.run(cmd, cwd=str(Path(__file__).parent.parent))
    return result.returncode == 0


def generate_summary_report(results: dict) -> bool:
    """
    Generate combined summary report.

    Args:
        results: Dict with keys 'api', 'ui', 'e2e', 'katalon' mapping to bool (passed/failed)
    """
    print("\n" + "="*60)
    print("TEST EXECUTION SUMMARY")
    print("="*60)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report_dir = Path(__file__).parent / "reports"

    overall_passed = all(results.values())

    summary = {
        "timestamp": timestamp,
        "suites": {
            suite: {
                "status": "PASSED" if passed else "FAILED",
                "report": str(report_dir / f"{suite}_report.html")
            }
            for suite, passed in results.items()
        },
        "overall": "PASSED" if overall_passed else "FAILED",
        "spec_coverage": {
            "Spec 1 — Authentication & i18n": "tracked by api + e2e markers",
            "Spec 2.1 — Quiz (manual + AI)": "tracked by wave1+user markers",
            "Spec 2.2 — Documents": "tracked by display+user markers",
            "Spec 2.3 — Flashcards": "tracked by display+user markers",
            "Spec 2.4 — Videos": "tracked by display+user markers",
            "Spec 3 — Modules/Collections": "tracked by wave1+user markers",
            "Spec 4 — Courses & Progress": "tracked by wave1+wave2 markers"
        },
        "reports": {
            suite: str(report_dir / f"{suite}_report.html")
            for suite in results.keys()
        }
    }

    print(f"\nTimestamp: {summary['timestamp']}")
    for suite, info in summary["suites"].items():
        status_icon = "✓" if info["status"] == "PASSED" else "✗"
        print(f"{suite.upper():12} {status_icon} {info['status']}")
    print(f"\nOverall:     {'✓' if overall_passed else '✗'} {summary['overall']}")

    print(f"\nReports:")
    for suite, path in summary["reports"].items():
        print(f"  - {suite}: {path}")

    summary_file = report_dir / "summary.json"
    with open(summary_file, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nSummary saved to: {summary_file}")

    return overall_passed


def main():
    """Main test runner — runs all 4 suites in order"""
    print("\n🧪 Lumina LMS Automated Test Suite")
    print("="*60)

    reports_dir = Path(__file__).parent / "reports"
    reports_dir.mkdir(exist_ok=True)

    if not verify_services():
        print("\n❌ Test execution aborted: Services not running")
        return 1

    # Run all 4 suites
    results = {
        "api": run_api_tests(),
        "ui": run_ui_tests(),
        "e2e": run_e2e_tests(),
        "katalon": run_katalon_tests(),
    }

    overall_passed = generate_summary_report(results)

    print("\n" + "="*60)
    if overall_passed:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed. Review reports for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
