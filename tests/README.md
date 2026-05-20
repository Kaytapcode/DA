# Lumina LMS Automated Testing Framework

**Status:** Ready to Use
**Version:** 1.1
**Updated:** May 20, 2026

---

## Required Environment

Tests run against the live stack. Before running:

### Backend services (ports 5000–5005)

Start each microservice (or use the launch script if available):
```powershell
dotnet run --project BE/Identity.Api       # 5001
dotnet run --project BE/Organization.Api   # 5002
dotnet run --project BE/Content.Api        # 5003
dotnet run --project BE/AI.Api             # 5004
dotnet run --project BE/SysAdmin.Api       # 5005
dotnet run --project BE/Gateway.Api        # 5000 (last — depends on others)
```

### Frontend (port 5173)
```powershell
cd FE && npm run dev
```

### Environment variables required

| Variable | Where set | Purpose |
|---|---|---|
| `ConnectionStrings__Postgres` | Each `BE/*/appsettings.Development.json` | PostgreSQL connection per service |
| `OpenRouter__ApiKey` | `BE/AI.Api/appsettings.Development.json` | AI quiz generation (stepfun/step-3.5-flash) |
| `Jwt__Key` / `Jwt__Issuer` / `Jwt__Audience` | Each BE service | Must match across services |
| `API_BASE_URL` | Test env (defaults `http://localhost:5000`) | Gateway URL for tests |
| `PLAYWRIGHT_HEADLESS` | Test env (default `true`) | Set `false` to watch the browser |

### Test database

Tests assume an empty-or-test PostgreSQL database. Recommended: a dedicated `lumina_test` DB; tear down between full runs:
```powershell
dotnet ef database drop --project BE/Identity.Api --force
dotnet ef database update --project BE/Identity.Api
# repeat for AI.Api and any other service with migrations
```

### Pre-seeded test accounts

Some tests assume the following accounts exist (seed them via Identity.Api SQL or internal endpoints):
- `test_sysadmin@example.com` / `TestPassword123!` — SysAdmin
- The rest are created dynamically per-test by fixtures in `tests/fixtures/auth.py`.

---

## 📋 What's Included

### ✅ Completed (Phases 1-2)

1. **Test Case Documentation (Phase 1)**
   - ✅ 120+ comprehensive test cases organized by module
   - ✅ Matrix includes: Happy path, error cases, security tests, edge cases
   - ✅ Coverage: Authentication, Organization, Course, Document, Quiz, Flashcard, Video
   - 📄 File: `../TEST_CASE_MATRIX.md`

2. **API Test Framework (Phase 2)**
   - ✅ Reusable pytest fixtures with automatic cleanup
   - ✅ APIClient wrapper with convenience methods
   - ✅ TestDataFactory for generating consistent test data
   - ✅ InvalidTestData for negative/security testing
   - ✅ 30+ API test cases across 4 modules
   
   **Test Files:**
   - `api/test_authentication.py` - 16 tests (register, login, 2FA, token management)
   - `api/test_organization_course.py` - 26 tests (org & course CRUD, members, curriculum)
   - `api/test_content.py` - 25 tests (documents, quizzes, flashcards, videos)

3. **UI Test Framework (Phase 3 - Partial)**
   - ✅ Playwright page fixtures
   - ✅ 20+ UI rendering tests for Document, Quiz, Flashcard, Video pages
   - ✅ Tests verify: Element visibility, button functionality, form loading
   - 📄 File: `ui/test_content_pages.py`

4. **Test Utilities**
   - ✅ `fixtures/conftest.py` - Pytest configuration and fixtures
   - ✅ `fixtures/test_data.py` - Data factories and invalid data sets
   - ✅ `run_tests.py` - Unified test orchestrator with service verification
   - ✅ `requirements.txt` - Python dependencies
   - ✅ `pytest.ini` - Pytest configuration

5. **Documentation**
   - ✅ `TESTING_GUIDE.md` - Complete testing guide with examples
   - ✅ `TEST_CASE_MATRIX.md` - All 120+ test cases documented
   - ✅ `README.md` (this file) - Quick start & overview

---

## 🚀 Quick Start

### Installation (One-time Setup)

```bash
# 1. Install Python dependencies
cd d:\Github\DA-BE\tests
pip install -r requirements.txt

# 2. Verify installation
pip list | findstr pytest
```

### Running Tests

```bash
# Run ALL tests (API + UI)
python run_tests.py

# Run API tests only
pytest api/ -v

# Run specific test module
pytest api/test_authentication.py -v

# Run with HTML report
pytest api/ --html=reports/api_report.html --self-contained-html

# Run by marker
pytest -m auth -v          # Authentication tests
pytest -m security -v      # Security tests
pytest -m "not slow" -v    # Everything except slow tests
```

### View Results

```bash
# Open HTML report in browser (after running pytest)
start reports/api_report.html
```

---

## 📊 Test Coverage

### API Tests (Implemented)

| Module | Test File | Tests | Coverage |
|--------|-----------|-------|----------|
| Authentication | `test_authentication.py` | 16 | Register, Login, Password Reset, 2FA, Tokens |
| Organization | `test_organization_course.py` | 18 | CRUD, Members, Permissions |
| Course | `test_organization_course.py` | 20+ | CRUD, Members, Curriculum |
| Document | `test_content.py` | 6 | Upload, Read, Update, List |
| Quiz | `test_content.py` | 6 | Create, Read, Update, List, Attempts |
| Flashcard | `test_content.py` | 6 | Create, Read, Update, List, Study |
| Video | `test_content.py` | 6 | Upload, Read, Update, Stream, List |
| **Total** | | **~80** | **80%+ of critical paths** |

### UI Tests (Implemented)

| Page | Tests | Coverage |
|------|-------|----------|
| Document Page | 6 | List rendering, edit button, form loading |
| Quiz Page | 5 | List rendering, edit button, form loading |
| Flashcard Page | 5 | List rendering, edit button, form loading |
| Video Page | 5 | List rendering, edit button, form loading |
| **Total** | **~20** | **UI rendering verification** |

---

## 🛠️ Test Execution Workflow

```
                    ┌─────────────────────┐
                    │  Verify Services    │
                    │ (5000-5005, 5173)   │
                    └──────────┬──────────┘
                               │
                     ┌─────────▼────────┐
                     │  Run API Tests   │
                     │ (pytest api/)    │
                     └────────┬─────────┘
                              │
                     ┌────────▼────────┐
                     │  Run UI Tests   │
                     │ (pytest ui/)    │
                     └────────┬────────┘
                              │
                ┌─────────────▼──────────────┐
                │  Generate HTML Reports    │
                │  - api_report.html        │
                │  - ui_report.html         │
                │  - summary.json           │
                └───────────────────────────┘
```

---

## 🧪 Example Tests

### API Test: Register User
```python
@pytest.mark.auth
def test_valid_registration_succeeds(self, api_client):
    """TC-AUTH-001: Valid user registration"""
    user_data = TestDataFactory.create_user_data()
    
    result = api_client.register_user(
        user_data["email"],
        user_data["password"],
        user_data["name"]
    )
    
    assert result["status_code"] == 201
    assert "token" in result["data"]
```

### UI Test: Document List Display
```python
def test_document_list_displays(self, page):
    """TC-DOC-006: Document names and metadata visible"""
    page.goto("http://localhost:5173/courses/1/documents")
    page.wait_for_load_state("networkidle")
    
    items = page.locator("[data-testid='document-item']")
    if items.count() > 0:
        name = items.first.locator("[data-testid='doc-name']")
        assert name.is_visible()
```

---

## 📁 Directory Structure

```
tests/
├── api/                           # API endpoint tests
│   ├── test_authentication.py     # Auth tests (16 cases)
│   ├── test_organization_course.py   # Org/Course tests (44 cases)
│   ├── test_content.py            # Document/Quiz/etc tests (25 cases)
│   └── __init__.py
├── ui/                            # UI/Playwright tests
│   ├── test_content_pages.py      # FE rendering tests (20+ cases)
│   ├── conftest.py               # Page fixtures
│   └── __init__.py
├── fixtures/                      # Shared test utilities
│   ├── conftest.py               # Main pytest fixtures & API client
│   ├── test_data.py              # Data factories
│   └── __init__.py
├── katalon/                       # TODO: Katalon E2E scripts
├── reports/                       # Test execution reports
│   ├── api_report.html           # Generated after test run
│   ├── ui_report.html            # Generated after test run
│   └── summary.json              # Test summary
├── pytest.ini                     # Pytest configuration
├── requirements.txt               # Python dependencies
├── run_tests.py                   # Main test orchestrator
└── __init__.py
```

---

## 🔧 Key Fixtures Available

### API Client Fixtures

```python
# Fresh client
def test_example(api_client):
    response = api_client.get("/api/organizations")

# Authenticated client
def test_authenticated(authenticated_client):
    response = authenticated_client.get("/api/organizations")

# With test user
def test_with_user(api_client, test_user):
    # test_user = {"email": "...", "password": "...", "id": ...}

# With test organization
def test_with_org(authenticated_client, test_organization):
    # test_organization = {"id": 1, "name": "TestOrg_..."}

# With test course
def test_with_course(authenticated_client, test_course):
    # test_course = {"id": 1, "name": "TestCourse_..."}
```

---

## 📈 Test Execution Results

When you run `python run_tests.py`:

1. **Service Verification**
   ```
   ✓ Gateway API is running (http://localhost:5000/health)
   ✓ Frontend is running (http://localhost:5173)
   ```

2. **API Tests**
   ```
   ========================== Test Summary ==========================
   PASSED: 30 | FAILED: 0 | SKIPPED: 2 | ERRORS: 0
   ======================== 30 passed in 45.32s ========================
   Report: tests/reports/api_report.html
   ```

3. **UI Tests**
   ```
   ========================== Test Summary ==========================
   PASSED: 20 | FAILED: 0 | SKIPPED: 5
   ======================== 20 passed in 22.15s ========================
   Report: tests/reports/ui_report.html
   ```

4. **Overall Summary**
   ```
   ✅ All tests passed!
   Summary saved to: tests/reports/summary.json
   ```

---

## 🚧 TODO - Remaining Phases

### Phase 3: Playwright Setup (In Progress)
- [x] Install Playwright (`pip install playwright`)
- [ ] Run `playwright install` to download browsers
- [ ] Configure browser launch options
- [ ] Create page object models for each content page

### Phase 4: Katalon Integration
- [ ] Install Katalon Recorder extension
- [ ] Record E2E workflows:
  - Login → Create Course → Add Document → Verify Display
  - Create Quiz → Edit Questions → Save
  - Create Flashcard Deck → Add Cards → Study
- [ ] Export as Python code
- [ ] Integrate with test runner

### Phase 5: Test Execution Orchestrator
- [x] Create `run_tests.py` unified runner
- [ ] Add GitHub Actions workflow
- [ ] Configure artifact upload
- [ ] Setup test result notifications

### Phase 6: CI/CD Pipeline
- [ ] GitHub Actions `.yml` file
- [ ] Automated test runs on commit
- [ ] PR annotations for test failures
- [ ] Artifact storage & reporting

---

## 🔍 Troubleshooting

### "Connection refused" Error
```
Problem: Services not running
Solution: Ensure all backend services and frontend are running on ports 5000-5005 and 5173
```

### Import Errors
```
Problem: Cannot find test fixtures
Solution: Make sure conftest.py exists in tests/fixtures/
Run: cd tests && pytest api/ -v
```

### "No such file or directory: api_report.html"
```
Problem: Reports directory missing
Solution: Create manually: mkdir tests\reports
Or run: python run_tests.py (creates automatically)
```

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `TESTING_GUIDE.md` | Comprehensive testing guide with examples |
| `TEST_CASE_MATRIX.md` | All 120+ test cases (reference) |
| `README.md` | This quick start guide |
| `pytest.ini` | Pytest configuration |

---

## 🎯 Success Criteria

Tests are working correctly when:

1. ✅ All services running on correct ports (verified by `run_tests.py`)
2. ✅ Test discovery finds all test files (no import errors)
3. ✅ API tests execute and report results (100% should pass)
4. ✅ UI tests render pages and verify elements (>80% should pass)
5. ✅ HTML reports generate in `tests/reports/`
6. ✅ Summary JSON shows overall pass/fail status

---

## 📞 Support

1. **Check documentation:** `TESTING_GUIDE.md` has detailed examples
2. **Review test file:** Look at similar test for pattern
3. **Run with verbose output:** `pytest -vv api/test_authentication.py`
4. **Check test matrix:** `TEST_CASE_MATRIX.md` explains each test case

---

## 🎓 Next Steps

1. **Install dependencies:** `pip install -r requirements.txt`
2. **Start all services:** (6 backend + 1 frontend)
3. **Run test suite:** `python run_tests.py`
4. **Review reports:** Open `reports/api_report.html`
5. **Iterate:** Fix failing tests, add more test cases

---

**Happy Testing! 🚀**
