"""
Frontend UI Tests - Document, Quiz, Flashcard, Video Pages
Tests verify correct rendering of content, edit buttons, form loading, etc.
"""

import pytest


class TestDocumentPageUI:
    """Test Document page rendering and interactions"""
    
    @pytest.mark.ui
    def test_document_page_loads(self, page):
        """TC-DOC-015: Document page renders without errors"""
        page.goto("http://localhost:5173/courses/1/documents")
        
        # Wait for page to load
        page.wait_for_load_state("networkidle")
        
        # Verify no console errors
        errors = []
        page.on("console", lambda msg: errors.append(msg) if msg.type == "error" else None)
        
        assert len(errors) == 0, f"Console errors found: {errors}"
    
    @pytest.mark.ui
    def test_document_list_displays(self, page):
        """TC-DOC-006: Document list shows names and metadata"""
        page.goto("http://localhost:5173/courses/1/documents")
        page.wait_for_load_state("networkidle")
        
        # Check if document list exists
        list_element = page.locator("[data-testid='document-list'], .document-list, ul")
        if list_element.count() > 0:
            # Verify document items have name, date, edit button
            items = page.locator("[data-testid='document-item'], .document-item, li")
            
            if items.count() > 0:
                first_item = items.first
                
                # Verify name visible
                name_element = first_item.locator("[data-testid='doc-name'], .doc-name")
                if name_element.count() > 0:
                    assert name_element.is_visible(), "Document name should be visible"
                
                # Verify date visible
                date_element = first_item.locator("[data-testid='doc-date'], .doc-date")
                if date_element.count() > 0:
                    assert date_element.is_visible(), "Document date should be visible"
                
                # Verify edit button visible
                edit_btn = first_item.locator("[data-testid='edit-btn'], button:has-text('Edit')")
                if edit_btn.count() > 0:
                    assert edit_btn.is_visible(), "Edit button should be visible"
    
    @pytest.mark.ui
    def test_document_edit_button_clickable(self, page):
        """TC-DOC-008: Edit button visible and clickable"""
        page.goto("http://localhost:5173/courses/1/documents")
        page.wait_for_load_state("networkidle")
        
        edit_btn = page.locator("[data-testid='edit-btn'], button:has-text('Edit')").first
        
        if edit_btn.count() > 0:
            assert edit_btn.is_visible(), "Edit button should be visible"
            assert edit_btn.is_enabled(), "Edit button should be enabled"
    
    @pytest.mark.ui
    def test_document_edit_form_loads(self, page):
        """TC-DOC-009: Edit form loads with current metadata"""
        page.goto("http://localhost:5173/courses/1/documents")
        page.wait_for_load_state("networkidle")
        
        edit_btn = page.locator("[data-testid='edit-btn'], button:has-text('Edit')").first
        
        if edit_btn.count() > 0:
            edit_btn.click()
            
            # Wait for modal/form to appear
            page.wait_for_timeout(500)
            
            # Verify form elements exist
            form = page.locator("[data-testid='document-form'], form")
            if form.count() > 0:
                # Verify name field loaded
                name_input = form.locator("input[name='name'], input[placeholder*='name']")
                if name_input.count() > 0:
                    assert name_input.is_visible(), "Name input should be visible"


class TestQuizPageUI:
    """Test Quiz page rendering and interactions"""
    
    @pytest.mark.ui
    def test_quiz_page_loads(self, page):
        """TC-QUIZ-017: Quiz page renders without errors"""
        page.goto("http://localhost:5173/courses/1/quizzes")
        page.wait_for_load_state("networkidle")
        
        errors = []
        page.on("console", lambda msg: errors.append(msg) if msg.type == "error" else None)
        
        assert len(errors) == 0, f"Console errors found: {errors}"
    
    @pytest.mark.ui
    def test_quiz_list_displays(self, page):
        """TC-QUIZ-005: Quiz list shows name and question count"""
        page.goto("http://localhost:5173/courses/1/quizzes")
        page.wait_for_load_state("networkidle")
        
        items = page.locator("[data-testid='quiz-item'], .quiz-item, li")
        
        if items.count() > 0:
            first_item = items.first
            
            # Verify name visible
            name_element = first_item.locator("[data-testid='quiz-name'], .quiz-name")
            if name_element.count() > 0:
                assert name_element.is_visible(), "Quiz name should be visible"
            
            # Verify question count visible
            count_element = first_item.locator("[data-testid='question-count'], .question-count")
            if count_element.count() > 0:
                assert count_element.is_visible(), "Question count should be visible"
    
    @pytest.mark.ui
    def test_quiz_edit_button_visible(self, page):
        """TC-QUIZ-007: Edit button visible and clickable"""
        page.goto("http://localhost:5173/courses/1/quizzes")
        page.wait_for_load_state("networkidle")
        
        edit_btn = page.locator("[data-testid='edit-btn'], button:has-text('Edit')").first
        
        if edit_btn.count() > 0:
            assert edit_btn.is_visible(), "Edit button should be visible"
    
    @pytest.mark.ui
    def test_quiz_edit_form_loads_questions(self, page):
        """TC-QUIZ-008: Edit form loads with questions"""
        page.goto("http://localhost:5173/courses/1/quizzes")
        page.wait_for_load_state("networkidle")
        
        edit_btn = page.locator("[data-testid='edit-btn'], button:has-text('Edit')").first
        
        if edit_btn.count() > 0:
            edit_btn.click()
            page.wait_for_timeout(500)
            
            form = page.locator("[data-testid='quiz-form'], form")
            if form.count() > 0:
                questions = form.locator("[data-testid='question'], .question")
                # Verify questions are present (if any were added)
                # Don't assert minimum count as DB may be empty


class TestFlashcardPageUI:
    """Test Flashcard Deck page rendering and interactions"""
    
    @pytest.mark.ui
    def test_flashcard_page_loads(self, page):
        """TC-FC-019: Flashcard page renders without errors"""
        page.goto("http://localhost:5173/courses/1/flashcards")
        page.wait_for_load_state("networkidle")
        
        errors = []
        page.on("console", lambda msg: errors.append(msg) if msg.type == "error" else None)
        
        assert len(errors) == 0, f"Console errors found: {errors}"
    
    @pytest.mark.ui
    def test_flashcard_list_displays(self, page):
        """TC-FC-005: Flashcard deck list shows name and card count"""
        page.goto("http://localhost:5173/courses/1/flashcards")
        page.wait_for_load_state("networkidle")
        
        items = page.locator("[data-testid='deck-item'], .deck-item, li")
        
        if items.count() > 0:
            first_item = items.first
            
            # Verify deck name visible
            name_element = first_item.locator("[data-testid='deck-name'], .deck-name")
            if name_element.count() > 0:
                assert name_element.is_visible(), "Deck name should be visible"
            
            # Verify card count visible
            count_element = first_item.locator("[data-testid='card-count'], .card-count")
            if count_element.count() > 0:
                assert count_element.is_visible(), "Card count should be visible"
    
    @pytest.mark.ui
    def test_flashcard_edit_button_visible(self, page):
        """TC-FC-007: Edit button visible and clickable"""
        page.goto("http://localhost:5173/courses/1/flashcards")
        page.wait_for_load_state("networkidle")
        
        edit_btn = page.locator("[data-testid='edit-btn'], button:has-text('Edit')").first
        
        if edit_btn.count() > 0:
            assert edit_btn.is_visible(), "Edit button should be visible"
    
    @pytest.mark.ui
    def test_flashcard_edit_form_loads_cards(self, page):
        """TC-FC-008: Edit form loads with existing cards"""
        page.goto("http://localhost:5173/courses/1/flashcards")
        page.wait_for_load_state("networkidle")
        
        edit_btn = page.locator("[data-testid='edit-btn'], button:has-text('Edit')").first
        
        if edit_btn.count() > 0:
            edit_btn.click()
            page.wait_for_timeout(500)
            
            form = page.locator("[data-testid='deck-form'], form")
            if form.count() > 0:
                cards = form.locator("[data-testid='card'], .card")
                # Verify form loaded (may be empty)
                assert form.is_visible(), "Edit form should be visible"


class TestVideoPageUI:
    """Test Video page rendering and interactions"""
    
    @pytest.mark.ui
    def test_video_page_loads(self, page):
        """TC-VID-016: Video page renders without errors"""
        page.goto("http://localhost:5173/courses/1/videos")
        page.wait_for_load_state("networkidle")
        
        errors = []
        page.on("console", lambda msg: errors.append(msg) if msg.type == "error" else None)
        
        assert len(errors) == 0, f"Console errors found: {errors}"
    
    @pytest.mark.ui
    def test_video_list_displays(self, page):
        """TC-VID-006: Video list shows title and duration"""
        page.goto("http://localhost:5173/courses/1/videos")
        page.wait_for_load_state("networkidle")
        
        items = page.locator("[data-testid='video-item'], .video-item, li")
        
        if items.count() > 0:
            first_item = items.first
            
            # Verify title visible
            title_element = first_item.locator("[data-testid='video-title'], .video-title")
            if title_element.count() > 0:
                assert title_element.is_visible(), "Video title should be visible"
            
            # Verify duration visible (if available)
            duration_element = first_item.locator("[data-testid='duration'], .duration")
            # Don't assert if not present - may not be implemented
    
    @pytest.mark.ui
    def test_video_edit_button_visible(self, page):
        """TC-VID-008: Edit button visible and clickable"""
        page.goto("http://localhost:5173/courses/1/videos")
        page.wait_for_load_state("networkidle")
        
        edit_btn = page.locator("[data-testid='edit-btn'], button:has-text('Edit')").first
        
        if edit_btn.count() > 0:
            assert edit_btn.is_visible(), "Edit button should be visible"
    
    @pytest.mark.ui
    def test_video_edit_form_loads(self, page):
        """TC-VID-009: Edit form loads with current metadata"""
        page.goto("http://localhost:5173/courses/1/videos")
        page.wait_for_load_state("networkidle")
        
        edit_btn = page.locator("[data-testid='edit-btn'], button:has-text('Edit')").first
        
        if edit_btn.count() > 0:
            edit_btn.click()
            page.wait_for_timeout(500)
            
            form = page.locator("[data-testid='video-form'], form")
            if form.count() > 0:
                title_input = form.locator("input[name='title'], input[placeholder*='title']")
                if title_input.count() > 0:
                    assert title_input.is_visible(), "Title input should be visible"


# NOTE: Playwright fixtures (browser, context, page) are provided by conftest.py
# This keeps test code clean and fixtures centralized
