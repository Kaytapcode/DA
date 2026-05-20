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


def generate_summary_report(api_passed: bool, ui_passed: bool):
    """Generate summary report"""
    print("\n" + "="*60)
    print("TEST EXECUTION SUMMARY")
    print("="*60)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report_dir = Path(__file__).parent / "reports"
    
    summary = {
        "timestamp": timestamp,
        "api_tests": "✓ PASSED" if api_passed else "✗ FAILED",
        "ui_tests": "✓ PASSED" if ui_passed else "✗ FAILED",
        "overall": "✓ PASSED" if (api_passed and ui_passed) else "✗ FAILED",
        "reports": {
            "api": str(report_dir / "api_report.html"),
            "ui": str(report_dir / "ui_report.html"),
        }
    }
    
    print(f"\nTimestamp: {summary['timestamp']}")
    print(f"API Tests:  {summary['api_tests']}")
    print(f"UI Tests:   {summary['ui_tests']}")
    print(f"Overall:    {summary['overall']}")
    print(f"\nReports:")
    print(f"  - API: {summary['reports']['api']}")
    print(f"  - UI:  {summary['reports']['ui']}")
    
    # Save summary as JSON
    summary_file = report_dir / "summary.json"
    with open(summary_file, "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nSummary saved to: {summary_file}")
    
    return summary["overall"] == "✓ PASSED"


def main():
    """Main test runner"""
    print("\n🧪 Tiny-LMS Automated Test Suite")
    print("="*60)
    
    # Create reports directory
    reports_dir = Path(__file__).parent / "reports"
    reports_dir.mkdir(exist_ok=True)
    
    # Verify services
    if not verify_services():
        print("\n❌ Test execution aborted: Services not running")
        return 1
    
    # Run tests
    api_passed = run_api_tests()
    ui_passed = run_ui_tests()
    
    # Generate report
    overall_passed = generate_summary_report(api_passed, ui_passed)
    
    print("\n" + "="*60)
    if overall_passed:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed. Review reports for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
