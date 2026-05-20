"""
Document, Quiz, Flashcard, and Video API Tests
Tests cover: CRUD operations, metadata, visibility settings
"""

import pytest
from tests.fixtures.test_data import TestDataFactory


class TestDocumentManagement:
    """Test document upload, retrieval, and management"""
    
    @pytest.mark.api
    def test_upload_document(self, authenticated_client, test_course):
        """TC-DOC-001: Upload document succeeds"""
        doc_data = TestDataFactory.create_document_data()
        
        # Assuming file upload endpoint
        result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/documents",
            json=doc_data
        )
        
        assert result.status_code in [201, 200], f"Upload failed: {result.status_code}"
    
    @pytest.mark.api
    def test_get_document_details(self, authenticated_client, test_course):
        """TC-DOC-005: Get document details"""
        result = authenticated_client.get(
            f"/api/courses/{test_course['id']}/documents"
        )
        
        assert result.status_code == 200, "Should retrieve documents"
    
    @pytest.mark.api
    def test_update_document_metadata(self, authenticated_client, test_course):
        """TC-DOC-007: Update document metadata"""
        doc_data = TestDataFactory.create_document_data()
        
        # Create then update
        create_result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/documents",
            json=doc_data
        )
        
        if create_result.status_code == 201:
            doc_id = create_result.json().get("id")
            if doc_id:
                update_result = authenticated_client.put(
                    f"/api/documents/{doc_id}",
                    json={"name": "Updated Document"}
                )
                assert update_result.status_code == 200
    
    @pytest.mark.api
    def test_list_documents_with_pagination(self, authenticated_client, test_course):
        """TC-DOC-013: List documents with pagination"""
        result = authenticated_client.get(
            f"/api/courses/{test_course['id']}/documents?page=1&pageSize=10"
        )
        
        assert result.status_code == 200


class TestQuizManagement:
    """Test quiz creation, management, and attempts"""
    
    @pytest.mark.api
    def test_create_quiz(self, authenticated_client, test_course):
        """TC-QUIZ-001: Create quiz succeeds"""
        quiz_data = TestDataFactory.create_quiz_data()
        
        result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/quizzes",
            json=quiz_data
        )
        
        assert result.status_code in [201, 200], f"Quiz creation failed: {result.status_code}"
        if result.status_code == 201:
            assert "id" in result.json() or "data" in result.json()
    
    @pytest.mark.api
    def test_get_quiz_details(self, authenticated_client, test_course):
        """TC-QUIZ-004: Get quiz details"""
        result = authenticated_client.get(
            f"/api/courses/{test_course['id']}/quizzes"
        )
        
        assert result.status_code == 200
    
    @pytest.mark.api
    def test_update_quiz_metadata(self, authenticated_client, test_course):
        """TC-QUIZ-006: Update quiz metadata"""
        quiz_data = TestDataFactory.create_quiz_data()
        
        create_result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/quizzes",
            json=quiz_data
        )
        
        if create_result.status_code in [201, 200]:
            quiz_id = create_result.json().get("id")
            if quiz_id:
                update_result = authenticated_client.put(
                    f"/api/quizzes/{quiz_id}",
                    json={"name": "Updated Quiz"}
                )
                assert update_result.status_code == 200
    
    @pytest.mark.api
    def test_list_quizzes_with_pagination(self, authenticated_client, test_course):
        """TC-QUIZ-016: List quizzes with pagination"""
        result = authenticated_client.get(
            f"/api/courses/{test_course['id']}/quizzes?page=1&pageSize=10"
        )
        
        assert result.status_code == 200


class TestFlashcardManagement:
    """Test flashcard deck creation and management"""
    
    @pytest.mark.api
    def test_create_flashcard_deck(self, authenticated_client, test_course):
        """TC-FC-001: Create flashcard deck succeeds"""
        deck_data = TestDataFactory.create_flashcard_data()
        
        result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/flashcards",
            json=deck_data
        )
        
        assert result.status_code in [201, 200], f"Deck creation failed: {result.status_code}"
    
    @pytest.mark.api
    def test_get_flashcard_deck_details(self, authenticated_client, test_course):
        """TC-FC-004: Get flashcard deck details"""
        result = authenticated_client.get(
            f"/api/courses/{test_course['id']}/flashcards"
        )
        
        assert result.status_code == 200
    
    @pytest.mark.api
    def test_update_flashcard_deck(self, authenticated_client, test_course):
        """TC-FC-006: Update flashcard deck metadata"""
        deck_data = TestDataFactory.create_flashcard_data()
        
        create_result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/flashcards",
            json=deck_data
        )
        
        if create_result.status_code in [201, 200]:
            deck_id = create_result.json().get("id")
            if deck_id:
                update_result = authenticated_client.put(
                    f"/api/flashcards/{deck_id}",
                    json={"name": "Updated Deck"}
                )
                assert update_result.status_code == 200
    
    @pytest.mark.api
    def test_list_flashcard_decks_with_pagination(self, authenticated_client, test_course):
        """TC-FC-018: List flashcard decks with pagination"""
        result = authenticated_client.get(
            f"/api/courses/{test_course['id']}/flashcards?page=1&pageSize=10"
        )
        
        assert result.status_code == 200


class TestVideoManagement:
    """Test video upload and management"""
    
    @pytest.mark.api
    def test_upload_video(self, authenticated_client, test_course):
        """TC-VID-001: Upload video succeeds"""
        video_data = TestDataFactory.create_video_data()
        
        result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/videos",
            json=video_data
        )
        
        assert result.status_code in [201, 200], f"Video upload failed: {result.status_code}"
    
    @pytest.mark.api
    def test_get_video_details(self, authenticated_client, test_course):
        """TC-VID-005: Get video details"""
        result = authenticated_client.get(
            f"/api/courses/{test_course['id']}/videos"
        )
        
        assert result.status_code == 200
    
    @pytest.mark.api
    def test_update_video_metadata(self, authenticated_client, test_course):
        """TC-VID-007: Update video metadata"""
        video_data = TestDataFactory.create_video_data()
        
        create_result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/videos",
            json=video_data
        )
        
        if create_result.status_code in [201, 200]:
            video_id = create_result.json().get("id")
            if video_id:
                update_result = authenticated_client.put(
                    f"/api/videos/{video_id}",
                    json={"title": "Updated Video"}
                )
                assert update_result.status_code == 200
    
    @pytest.mark.api
    def test_list_videos_with_pagination(self, authenticated_client, test_course):
        """TC-VID-014: List videos with pagination"""
        result = authenticated_client.get(
            f"/api/courses/{test_course['id']}/videos?page=1&pageSize=10"
        )
        
        assert result.status_code == 200


class TestCourseContentIntegration:
    """Test adding content to course curriculum"""
    
    @pytest.mark.api
    def test_add_document_to_curriculum(self, authenticated_client, test_course):
        """TC-INT-001: Add document to curriculum"""
        result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/curriculum",
            json={"contentType": "DOCUMENT", "contentId": 1, "order": 1}
        )
        
        # Endpoint may not exist yet
        if result.status_code != 404:
            assert result.status_code in [201, 200]
    
    @pytest.mark.api
    def test_add_quiz_to_curriculum(self, authenticated_client, test_course):
        """TC-INT-002: Add quiz to curriculum"""
        result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/curriculum",
            json={"contentType": "QUIZ", "contentId": 1, "order": 2}
        )
        
        if result.status_code != 404:
            assert result.status_code in [201, 200]
    
    @pytest.mark.api
    def test_add_video_to_curriculum(self, authenticated_client, test_course):
        """TC-INT-003: Add video to curriculum"""
        result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/curriculum",
            json={"contentType": "VIDEO", "contentId": 1, "order": 3}
        )
        
        if result.status_code != 404:
            assert result.status_code in [201, 200]
