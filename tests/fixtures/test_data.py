"""
Test data factory and test data generators for Tiny-LMS
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
import random
import string


class TestDataFactory:
    """Factory for generating test data"""
    
    @staticmethod
    def random_string(length: int = 8) -> str:
        """Generate random alphanumeric string"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    @staticmethod
    def random_email() -> str:
        """Generate random email"""
        return f"test_{TestDataFactory.random_string()}@example.com"
    
    @staticmethod
    def create_user_data(email: str = None, password: str = None, name: str = None) -> Dict[str, str]:
        """Create user registration data"""
        return {
            "email": email or TestDataFactory.random_email(),
            "password": password or "ValidPassword123!",
            "name": name or f"Test User {TestDataFactory.random_string()}"
        }
    
    @staticmethod
    def create_organization_data(name: str = None, description: str = None) -> Dict[str, str]:
        """Create organization data"""
        return {
            "name": name or f"TestOrg_{TestDataFactory.random_string()}",
            "description": description or "Test Organization Description",
            "logo": "https://example.com/logo.png"
        }
    
    @staticmethod
    def create_course_data(name: str = None, description: str = None, visibility: str = "PUBLIC") -> Dict[str, str]:
        """Create course data"""
        return {
            "name": name or f"TestCourse_{TestDataFactory.random_string()}",
            "description": description or "Test Course Description",
            "icon": "https://example.com/course-icon.png",
            "visibility": visibility
        }
    
    @staticmethod
    def create_document_data(name: str = None, description: str = None) -> Dict[str, str]:
        """Create document metadata"""
        return {
            "name": name or f"Document_{TestDataFactory.random_string()}.pdf",
            "description": description or "Test Document Description",
            "visibility": "PUBLIC"
        }
    
    @staticmethod
    def create_quiz_data(name: str = None, questions: List[Dict] = None) -> Dict[str, Any]:
        """Create quiz data"""
        default_questions = [
            {
                "type": "MULTIPLE_CHOICE",
                "text": "What is 2 + 2?",
                "options": ["3", "4", "5"],
                "correctAnswer": 1,
                "points": 1
            }
        ]
        return {
            "name": name or f"Quiz_{TestDataFactory.random_string()}",
            "description": "Test Quiz Description",
            "questions": questions or default_questions,
            "passingScore": 70,
            "showCorrectAnswers": True
        }
    
    @staticmethod
    def create_flashcard_data(name: str = None, cards: List[Dict] = None) -> Dict[str, Any]:
        """Create flashcard deck data"""
        default_cards = [
            {"front": "What is Python?", "back": "A high-level programming language"},
            {"front": "What does OOP stand for?", "back": "Object-Oriented Programming"}
        ]
        return {
            "name": name or f"Deck_{TestDataFactory.random_string()}",
            "description": "Test Flashcard Deck",
            "cards": cards or default_cards
        }
    
    @staticmethod
    def create_video_data(name: str = None, title: str = None, description: str = None) -> Dict[str, str]:
        """Create video metadata"""
        return {
            "name": name or f"Video_{TestDataFactory.random_string()}.mp4",
            "title": title or f"Test Video {TestDataFactory.random_string()}",
            "description": description or "Test Video Description",
            "visibility": "PUBLIC"
        }
    
    @staticmethod
    def create_quiz_attempt(answers: List[int] = None) -> Dict[str, Any]:
        """Create quiz attempt data"""
        return {
            "answers": answers or [1, 0, 1],  # Answer IDs
            "submittedAt": datetime.now().isoformat()
        }


# ============================================================================
# INVALID/EDGE CASE DATA
# ============================================================================

class InvalidTestData:
    """Invalid test data for negative testing"""
    
    @staticmethod
    def invalid_emails() -> List[str]:
        """Return list of invalid email formats"""
        return [
            "",
            "notanemail",
            "@example.com",
            "user@",
            "user @example.com",
            "user@.com",
            "user..name@example.com"
        ]
    
    @staticmethod
    def weak_passwords() -> List[str]:
        """Return list of weak passwords"""
        return [
            "",
            "123",
            "password",
            "12345678",
            "abcdefgh",
            "password123",  # No uppercase
            "PASSWORD123",  # No lowercase
            "Pass1234",  # No special char (depending on policy)
        ]
    
    @staticmethod
    def invalid_organization_names() -> List[str]:
        """Return list of invalid org names"""
        return [
            "",
            "a" * 256,  # Too long
            "<script>alert('xss')</script>",  # XSS attempt
            "'; DROP TABLE organizations; --",  # SQL injection attempt
        ]
    
    @staticmethod
    def xss_payloads() -> List[str]:
        """Return list of XSS attack payloads"""
        return [
            "<script>alert('xss')</script>",
            "<img src=x onerror='alert(1)'>",
            "javascript:alert('xss')",
            "<svg onload='alert(1)'>",
            "<body onload='alert(1)'>",
        ]
    
    @staticmethod
    def sql_injection_payloads() -> List[str]:
        """Return list of SQL injection payloads"""
        return [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "admin'--",
            "' UNION SELECT * FROM users --",
            "1' AND '1'='1",
        ]
