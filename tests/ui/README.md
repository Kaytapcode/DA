# Tiny-LMS UI Tests - Playwright Configuration

This directory contains end-to-end UI tests for Tiny-LMS frontend using Playwright.

## Setup Instructions

### 1. Install Dependencies

```bash
# Install Python dependencies (from tests directory)
pip install -r requirements.txt
```

### 2. Install Playwright Browsers

Playwright requires browser binaries to be installed:

```bash
# Install Chromium (and other browsers if needed)
python -m playwright install chromium

# Or install all supported browsers
python -m playwright install
```

**Note:** Browser installation is a one-time setup. The binaries are stored in a system cache directory.

### 3. Prerequisites

Before running tests, ensure:

- **Frontend is running** - UI tests expect the React frontend at `http://localhost:5173`
- **Backend API is running** - Tests may interact with API at `http://localhost:5000`
- **Test database is seeded** - Some tests require sample data

### 4. Running Tests

#### Collect tests without running (verify setup)
```bash
cd ../
pytest ui/ --co -q
```

#### Run all UI tests
```bash
cd ../
pytest ui/ -v
```

#### Run specific test class
```bash
cd ../
pytest ui/test_content_pages.py::TestDocumentPageUI -v
```

#### Run with specific browser (headless by default)
```bash
# Run in headed mode to see browser
PLAYWRIGHT_HEADLESS=false pytest ui/ -v

# Run with browser inspector
PLAYWRIGHT_HEADLESS=false PWDEBUG=1 pytest ui/ -v
```

#### Generate HTML report
```bash
cd ../
pytest ui/ --html=reports/ui_report.html --self-contained-html
```

## Test Structure

### Fixtures (conftest.py)

- **`playwright_instance`** (session scope) - Playwright instance for entire session
- **`browser`** (session scope) - Chromium browser, reused across all tests
- **`context`** (function scope) - Browser context, fresh for each test (isolated cookies/storage)
- **`page`** (function scope) - Browser page, fresh for each test

### Test Markers

```python
@pytest.mark.ui      # UI test marker (auto-applied to all ui/ tests)
@pytest.mark.slow    # Slow tests (>1 second)
@pytest.mark.browser # Browser automation test
```

### Test Configuration (pytest.ini)

- **Timeouts**: 30 seconds (configured in main pytest.ini)
- **Page defaults**: 10s action timeout, 30s navigation timeout
- **Viewport**: 1280x720px (desktop resolution)
- **HTTPS errors**: Ignored (for testing environments)

## Common Test Patterns

### Basic Page Navigation and Verification
```python
def test_page_loads(self, page):
    """TC-DOC-015: Document page renders without errors"""
    page.goto("http://localhost:5173/courses/1/documents")
    page.wait_for_load_state("networkidle")
    
    # Verify no console errors
    errors = []
    page.on("console", lambda msg: errors.append(msg) if msg.type == "error" else None)
    assert len(errors) == 0
```

### Element Visibility Checks
```python
def test_element_visible(self, page):
    """Verify element is visible and enabled"""
    page.goto("http://localhost:5173/courses/1/documents")
    
    edit_btn = page.locator("[data-testid='edit-btn']").first
    assert edit_btn.is_visible(), "Edit button should be visible"
    assert edit_btn.is_enabled(), "Edit button should be enabled"
```

### Form Interaction
```python
def test_form_submission(self, page):
    """Fill and submit a form"""
    page.goto("http://localhost:5173/documents/edit/1")
    
    # Fill form fields
    page.fill("input[name='title']", "Updated Title")
    page.fill("textarea[name='content']", "Updated content")
    
    # Submit form
    page.click("button:has-text('Save')")
    page.wait_for_load_state("networkidle")
```

### Conditional Testing
```python
def test_optional_elements(self, page):
    """Handle optional/dynamic elements gracefully"""
    page.goto("http://localhost:5173/courses/1/documents")
    
    # Check if element exists before asserting
    items = page.locator("[data-testid='document-item']")
    if items.count() > 0:
        assert items.first.is_visible()
    else:
        # Handle empty state
        pass
```

## Troubleshooting

### "Chromium executable not found"
**Solution:** Run `python -m playwright install chromium` to install browser binaries

### Tests time out
**Check:**
1. Is frontend running at `http://localhost:5173`?
2. Is backend API running at `http://localhost:5000`?
3. Increase timeout: Set `--timeout=60` in pytest command

### "Protocol error" in headed mode
**Solution:** Run in headless mode or check for port conflicts

### Tests fail with "Page not found (404)"
**Check:**
1. Verify correct URL in test
2. Verify frontend is running
3. Check console errors in headed mode (`PLAYWRIGHT_HEADLESS=false`)

## Best Practices

1. **Use data-testid attributes** - More reliable than class/role selectors
   ```python
   page.locator("[data-testid='edit-btn']")
   ```

2. **Wait for network idle** - After navigation or actions that trigger requests
   ```python
   page.wait_for_load_state("networkidle")
   ```

3. **Handle optional elements** - Use `.count()` before asserting visibility
   ```python
   if element.count() > 0:
       assert element.is_visible()
   ```

4. **Use fixtures properly** - Fresh `context` and `page` per test (no manual cleanup)

5. **Avoid hardcoded waits** - Use Playwright's built-in waits instead of `time.sleep()`

## CI/CD Integration

For CI environments:
```bash
# Set environment variables before running tests
export PLAYWRIGHT_HEADLESS=true
export PWDEBUG=0

# Run with parallelization (if using pytest-xdist)
pytest ui/ -n auto --html=reports/ui_report.html
```

## Documentation

- [Playwright Docs](https://playwright.dev/python/)
- [Playwright API Reference](https://playwright.dev/python/docs/api/class-page)
- [Test Case Matrix](../../TEST_CASE_MATRIX.md)
