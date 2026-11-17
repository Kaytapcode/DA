"""Personal-User content journeys, done in the browser like a real person (fresh account per test).

Spec 1 (profile, i18n, password), Spec 2.1 quiz, 2.2 document, 2.3 flashcards, 2.4 video,
Spec 3.1 collections, Spec 1 copy of public resources, learning history / progress.
"""
import re
import uuid

import pytest
from playwright.sync_api import expect

from .actions import login, logout, register_user

pytestmark = [pytest.mark.journey, pytest.mark.e2e, pytest.mark.wave1, pytest.mark.user]

YT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
YT_TITLE_PART = "Never Gonna Give You Up"


def _name(kind: str) -> str:
    return f"LuminaTest_{uuid.uuid4().hex[:8]}_{kind}"


def _new_user(page):
    c = register_user(page)
    login(page, c.username, c.password, "/user/home")
    return c


def _lib_item(page, text: str):
    return page.get_by_test_id("library-item").filter(has_text=text)


def _settled(page) -> None:
    page.wait_for_load_state("networkidle")


def _make_pdf(path) -> None:
    objs = [b"<</Type/Catalog/Pages 2 0 R>>", b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
            b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>"]
    out = b"%PDF-1.4\n"
    offs = []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 4\n0000000000 65535 f \n" + b"".join(f"{o:010d} 00000 n \n".encode() for o in offs)
    out += f"trailer\n<</Size 4/Root 1 0 R>>\nstartxref\n{xref}\n%%EOF\n".encode()
    path.write_bytes(out)


def _create_quiz(page, title: str, questions=None) -> None:
    """questions: list of (text, [4 option texts], explanation or ''); option 0 is the default correct one."""
    questions = questions or [(f"{title} Q1?", [f"{title} a", f"{title} b", f"{title} c", f"{title} d"], "")]
    page.goto("/user/quizzes/new")
    page.get_by_test_id("quiz-title-input").fill(title)
    for qi, (text, opts, expl) in enumerate(questions):
        if qi > 0:
            page.get_by_test_id("quiz-add-question-btn").click()
        page.get_by_test_id(f"quiz-question-{qi}-text").fill(text)
        for oi, o in enumerate(opts):
            page.get_by_test_id(f"quiz-question-{qi}-option-{oi}-text").fill(o)
        if expl:
            page.get_by_test_id(f"quiz-question-{qi}-explanation").fill(expl)
    page.get_by_test_id("quiz-save-btn").click()
    expect(page).to_have_url(re.compile(r"/user/library$"))
    expect(_lib_item(page, title)).to_be_visible()


def _create_deck(page, title: str, cards) -> None:
    page.goto("/user/decks/new")
    page.get_by_test_id("deck-title-input").fill(title)
    page.get_by_test_id("deck-create-btn").click()
    expect(page).to_have_url(re.compile(r"/user/decks/[^/]+/edit$"))
    for n, (front, back) in enumerate(cards, 1):
        page.get_by_test_id("flashcard-front-input").fill(front)
        page.get_by_test_id("flashcard-back-input").fill(back)
        page.get_by_test_id("flashcard-add-btn").click()
        expect(page.get_by_test_id("deck-card-row")).to_have_count(n)
    page.get_by_test_id("deck-done-btn").click()
    expect(page).to_have_url(re.compile(r"/user/library$"))
    expect(_lib_item(page, title)).to_be_visible()


def _upload_pdf(page, tmp_path, name: str) -> None:
    pdf = tmp_path / f"{name}.pdf"
    _make_pdf(pdf)
    page.goto("/user/library")
    page.get_by_test_id("library-upload-btn").click()
    page.get_by_test_id("document-upload-input").set_input_files(str(pdf))
    page.get_by_test_id("document-upload-submit").click()
    expect(page.get_by_test_id("document-upload-success")).to_be_visible()
    page.get_by_label("Close upload modal").click()
    expect(_lib_item(page, name)).to_be_visible()


def test_user_edits_profile_switches_language_and_changes_password(page, page2):
    """Spec 1: profile edit persists; vi/ja/en preference persists on the account (any device); password change."""  # Spec 1
    c = _new_user(page)
    new_username, new_email = c.username + "x", "new_" + c.email
    new_password = "New@Pass12345b"

    page.goto("/user/profile")
    page.get_by_test_id("profile-username-input").fill(new_username)
    page.get_by_test_id("profile-email-input").fill(new_email)
    page.get_by_test_id("profile-save-btn").click()
    expect(page.get_by_test_id("profile-success")).to_have_text("Profile updated.")
    page.reload()
    expect(page.get_by_test_id("profile-username-input")).to_have_value(new_username)
    expect(page.get_by_test_id("profile-email-input")).to_have_value(new_email)
    expect(page.get_by_test_id("user-sidebar-username")).to_have_text(new_username)

    for code in ("ja", "vi"):
        page.goto("/user/profile")
        page.get_by_test_id("profile-tab-language").click()
        for opt in ("vi", "ja", "en"):
            expect(page.get_by_test_id(f"language-option-{opt}")).to_be_visible()
        page.get_by_test_id(f"language-option-{code}").click()
        expect(page.get_by_test_id("language-success")).to_be_visible()
        page.goto("/user/profile")
        page.get_by_test_id("profile-tab-language").click()
        expect(page.get_by_test_id(f"language-option-{code}")).to_have_attribute("data-selected", "true")

    # Another device (fresh browser context, no local state): the saved preference is applied after login.
    login(page2, new_username, c.password, "/user/home")
    page2.goto("/user/library")
    expect(page2.get_by_role("heading", name="Thư Viện Học Tập")).to_be_visible()

    page.goto("/user/profile")
    page.get_by_test_id("profile-tab-security").click()
    page.get_by_test_id("change-password-current").fill(c.password)
    page.get_by_test_id("change-password-new").fill(new_password)
    page.get_by_test_id("change-password-confirm").fill(new_password)
    page.get_by_test_id("change-password-submit").click()
    expect(page.get_by_test_id("change-password-success")).to_have_text("Password changed.")
    logout(page)

    page.get_by_test_id("login-identifier").fill(new_username)
    page.get_by_test_id("login-password").fill(c.password)
    page.get_by_test_id("login-submit").click()
    expect(page.get_by_test_id("login-error")).to_have_text("Invalid login credentials.")
    expect(page).to_have_url(re.compile(r"/login$"))
    login(page, new_username, new_password, "/user/home")


def test_user_creates_edits_plays_and_deletes_manual_quiz(page):
    """Spec 2.1/2.x: manual quiz, explanation optional; auto-grading; explanation shown only where present."""  # Spec 2.1
    _new_user(page)
    title = _name("quiz")
    renamed = title + "_renamed"
    q1 = (f"{title} Q1?", ["Right one", "Wrong one", "Wrong two", "Wrong three"], "Because Q1 says so")
    q2 = (f"{title} Q2?", ["Q2 bad", "Q2 good", "Q2 bad too", "Q2 bad three"], "")
    page.goto("/user/quizzes/new")
    page.get_by_test_id("quiz-title-input").fill(title)
    for qi, (text, opts, expl) in enumerate((q1, q2)):
        if qi > 0:
            page.get_by_test_id("quiz-add-question-btn").click()
        page.get_by_test_id(f"quiz-question-{qi}-text").fill(text)
        for oi, o in enumerate(opts):
            page.get_by_test_id(f"quiz-question-{qi}-option-{oi}-text").fill(o)
        if expl:
            page.get_by_test_id(f"quiz-question-{qi}-explanation").fill(expl)
    page.get_by_test_id("quiz-question-1-option-1-correct").check()
    page.get_by_test_id("quiz-save-btn").click()
    expect(page.get_by_test_id("quiz-success")).to_be_visible()
    expect(page).to_have_url(re.compile(r"/user/library$"))
    expect(_lib_item(page, title)).to_be_visible()

    _lib_item(page, title).get_by_test_id("library-item-title").click()
    expect(page).to_have_url(re.compile(r"/user/quiz\?quizId="))
    expect(page.get_by_test_id("quiz-title")).to_contain_text(title)
    page.get_by_test_id("quiz-edit-toggle").click()
    page.get_by_test_id("quiz-edit-title-input").fill(renamed)
    page.get_by_test_id("quiz-edit-save-btn").click()
    expect(page.get_by_test_id("quiz-edit-success")).to_have_text("Quiz saved.")
    page.reload()
    expect(page.get_by_test_id("quiz-title")).to_contain_text(renamed)
    page.goto("/user/library")
    expect(_lib_item(page, renamed)).to_be_visible()

    _lib_item(page, renamed).get_by_test_id("library-item-title").click()
    page.get_by_role("button", name="Right one", exact=True).click()
    page.get_by_role("button", name="Next Question").click()
    page.get_by_role("button", name="Q2 bad", exact=True).click()
    page.get_by_test_id("quiz-play-submit").click()
    expect(page.get_by_test_id("quiz-play-score")).to_contain_text("50%")
    expect(page.get_by_test_id("quiz-result-item")).to_have_count(2)
    expect(page.get_by_test_id("quiz-play-explanation")).to_have_count(1)
    expect(page.get_by_test_id("quiz-play-explanation")).to_have_text("Because Q1 says so")

    page.goto("/user/library")
    _lib_item(page, renamed).get_by_test_id("library-item-delete-btn").click()
    page.get_by_test_id("library-item-delete-confirm").click()
    expect(page.get_by_text("No materials yet")).to_be_visible()
    page.reload()
    expect(page.get_by_text("No materials yet")).to_be_visible()


def test_user_studies_flashcards_masters_resets_renames_and_deletes_deck(page):
    """Spec 2.3: mastered cards are hidden from later sessions until reset; deck rename persists; delete."""  # Spec 2.3
    _new_user(page)
    title = _name("deck")
    renamed = title + "_renamed"
    cards = [(f"{title} front{i}", f"{title} back{i}") for i in (1, 2, 3)]
    _create_deck(page, title, cards)

    _lib_item(page, title).get_by_test_id("library-item-title").click()
    expect(page).to_have_url(re.compile(r"/user/flashcards\?deckId="))
    expect(page.get_by_test_id("deck-title")).to_have_text(title)
    expect(page.get_by_test_id("flashcard-counter")).to_have_text("Card 1/3")
    page.get_by_test_id("flashcard-shuffle-btn").click()
    expect(page.get_by_test_id("flashcard-shuffle-btn")).to_contain_text("Shuffled")
    page.get_by_test_id("flashcard-flip-btn").click()
    expect(page.get_by_test_id("flashcard-back-text")).to_contain_text("back")
    page.get_by_test_id("flashcard-flip-btn").click()
    mastered_front = page.get_by_test_id("flashcard-front-text").inner_text()
    page.get_by_test_id("flashcard-mastered-btn").click()
    expect(page.get_by_test_id("flashcard-counter")).to_have_text("Card 1/2")

    page.reload()
    expect(page.get_by_test_id("flashcard-counter")).to_have_text("Card 1/2")
    for _ in range(2):
        expect(page.get_by_test_id("flashcard-front-text")).not_to_have_text(mastered_front)
        page.get_by_test_id("flashcard-next-btn").click()

    page.get_by_test_id("flashcard-mastered-btn").click()
    page.get_by_test_id("flashcard-mastered-btn").click()
    expect(page.get_by_test_id("flashcard-all-mastered")).to_be_visible()
    page.get_by_test_id("flashcard-reset-btn").click()
    expect(page.get_by_test_id("flashcard-counter")).to_have_text("Card 1/3")
    page.reload()
    expect(page.get_by_test_id("flashcard-counter")).to_have_text("Card 1/3")

    page.get_by_test_id("deck-edit-toggle").click()
    page.get_by_test_id("deck-edit-title-input").fill(renamed)
    page.get_by_test_id("deck-edit-save-btn").click()
    expect(page.get_by_test_id("deck-edit-success")).to_have_text("Deck saved.")
    page.reload()
    expect(page.get_by_test_id("deck-title")).to_have_text(renamed)

    page.goto("/user/library")
    _lib_item(page, renamed).get_by_test_id("library-item-delete-btn").click()
    page.get_by_test_id("library-item-delete-confirm").click()
    expect(page.get_by_text("No materials yet")).to_be_visible()
    page.reload()
    expect(page.get_by_text("No materials yet")).to_be_visible()


def test_user_uploads_views_renames_and_deletes_pdf_and_non_pdf_is_refused(page, tmp_path):
    """Spec 2.2: PDF upload (format stated), viewer, rename, delete; unsupported file refused with a message."""  # Spec 2.2
    _new_user(page)
    name = _name("doc")
    renamed = name + "_renamed"

    page.goto("/user/library")
    page.get_by_test_id("library-upload-btn").click()
    expect(page.get_by_test_id("document-upload-modal")).to_contain_text("PDF")
    bad = tmp_path / f"{name}.docx"
    bad.write_bytes(b"not a pdf")
    page.get_by_test_id("document-upload-input").set_input_files(str(bad))
    page.get_by_test_id("document-upload-submit").click()
    expect(page.get_by_test_id("document-upload-error")).to_have_text("Unsupported file type. Use PDF, PNG, JPEG, or TXT.")
    page.get_by_label("Close upload modal").click()
    expect(page.get_by_text("No materials yet")).to_be_visible()

    _upload_pdf(page, tmp_path, name)
    _lib_item(page, name).get_by_test_id("library-item-title").click()
    expect(page).to_have_url(re.compile(r"/user/documents\?docId="))
    expect(page.get_by_test_id("document-title")).to_have_text(name)
    expect(page.get_by_test_id("document-pdf-frame")).to_be_visible()

    page.get_by_test_id("document-edit-btn").click()
    page.get_by_test_id("document-rename-input").fill(renamed)
    page.get_by_test_id("document-rename-save").click()
    expect(page.get_by_test_id("document-title")).to_have_text(renamed)
    page.reload()
    expect(page.get_by_test_id("document-title")).to_have_text(renamed)

    page.goto("/user/library")
    _lib_item(page, renamed).get_by_test_id("library-item-delete-btn").click()
    page.get_by_test_id("library-item-delete-confirm").click()
    expect(page.get_by_text("No materials yet")).to_be_visible()
    page.reload()
    expect(page.get_by_text("No materials yet")).to_be_visible()


def test_user_saves_youtube_video_with_auto_title_watches_and_renames_it(page):
    """Spec 2.4: pasted YouTube link -> title fetched from YouTube, embedded player, rename persists."""  # Spec 2.4
    _new_user(page)
    renamed = _name("video")
    page.goto("/user/videos/new")
    page.get_by_test_id("video-url-input").fill(YT_URL)
    expect(page.get_by_test_id("video-title-input")).to_have_value("")
    page.get_by_test_id("video-save-btn").click()
    expect(page.get_by_text("Saved to library!")).to_be_visible()
    page.get_by_test_id("video-back-library-btn").click()
    item = page.get_by_test_id("library-item")
    expect(item.get_by_test_id("library-item-title")).to_contain_text(YT_TITLE_PART)
    item.get_by_test_id("library-item-title").click()
    expect(page).to_have_url(re.compile(r"/user/videos/watch/"))
    expect(page.get_by_test_id("video-title")).to_contain_text(YT_TITLE_PART)
    expect(page.get_by_test_id("video-player")).to_have_attribute("src", re.compile(r"youtube\.com/embed/dQw4w9WgXcQ"))

    page.get_by_test_id("video-edit-btn").click()
    page.get_by_test_id("video-rename-input").fill(renamed)
    page.get_by_test_id("video-rename-save").click()
    expect(page.get_by_test_id("video-title")).to_have_text(renamed)
    page.reload()
    expect(page.get_by_test_id("video-title")).to_have_text(renamed)


def test_user_builds_collection_with_items_and_section_removes_item_and_deletes_it(page):
    """Spec 3.1: collections group the user's resources, optional sections, remove item, delete collection."""  # Spec 3.1
    _new_user(page)
    quiz1, quiz2, deck = _name("cq1"), _name("cq2"), _name("cdeck")
    coll, section = _name("coll"), _name("sec")
    _create_quiz(page, quiz1)
    _create_quiz(page, quiz2)
    _create_deck(page, deck, [(f"{deck} f", f"{deck} b")])

    page.goto("/user/collections")
    page.get_by_test_id("collection-new-btn").click()
    page.get_by_test_id("collection-title-input").fill(coll)
    page.get_by_test_id("collection-create-btn").click()
    card = page.get_by_test_id("collection-card").filter(has_text=coll)
    expect(card).to_be_visible()
    card.get_by_test_id("collection-card-title").click()
    expect(page.get_by_test_id("collection-detail-title")).to_have_text(coll)

    page.get_by_test_id("collection-add-content-btn").click()
    page.get_by_test_id("collection-addtype-QUIZ").click()
    page.get_by_test_id("collection-add-row").filter(has_text=quiz1).get_by_role("button", name="Add", exact=True).click()
    expect(page.get_by_test_id("collection-item").filter(has_text=quiz1)).to_be_visible()
    page.get_by_test_id("collection-addtype-FLASHCARD").click()
    page.get_by_test_id("collection-add-row").filter(has_text=deck).get_by_role("button", name="Add", exact=True).click()
    expect(page.get_by_test_id("collection-item").filter(has_text=deck)).to_be_visible()

    page.get_by_test_id("collection-add-section-btn").click()
    page.get_by_test_id("collection-section-title-input").fill(section)
    page.get_by_test_id("collection-section-create-btn").click()
    expect(page.get_by_test_id("collection-sections")).to_contain_text(section)
    page.locator("[data-testid^='collection-section-add-']").click()
    expect(page.get_by_test_id("collection-add-target")).to_contain_text(section)
    page.get_by_test_id("collection-addtype-QUIZ").click()
    page.get_by_test_id("collection-add-row").filter(has_text=quiz2).get_by_role("button", name="Add", exact=True).click()
    expect(page.get_by_test_id("collection-section-item").filter(has_text=quiz2)).to_be_visible()

    page.reload()
    page.get_by_test_id("collection-card").filter(has_text=coll).get_by_test_id("collection-card-title").click()
    expect(page.get_by_test_id("collection-item").filter(has_text=quiz1)).to_be_visible()
    expect(page.get_by_test_id("collection-item").filter(has_text=deck)).to_be_visible()
    expect(page.get_by_test_id("collection-sections")).to_contain_text(section)
    expect(page.get_by_test_id("collection-section-item").filter(has_text=quiz2)).to_be_visible()

    page.get_by_test_id("collection-item").filter(has_text=deck).get_by_test_id("collection-item-remove-btn").click()
    expect(page.get_by_test_id("collection-item").filter(has_text=deck)).to_have_count(0)
    page.reload()
    page.get_by_test_id("collection-card").filter(has_text=coll).get_by_test_id("collection-card-title").click()
    expect(page.get_by_test_id("collection-item").filter(has_text=quiz1)).to_be_visible()
    expect(page.get_by_test_id("collection-item").filter(has_text=deck)).to_have_count(0)

    page.goto("/user/collections")
    page.get_by_test_id("collection-card").filter(has_text=coll).get_by_test_id("collection-delete-btn").click()
    page.get_by_test_id("collection-delete-confirm").click()
    expect(page.get_by_test_id("collection-card").filter(has_text=coll)).to_have_count(0)
    page.reload()
    expect(page.get_by_test_id("collection-new-btn")).to_be_visible()
    _settled(page)
    expect(page.get_by_test_id("collection-card").filter(has_text=coll)).to_have_count(0)


def test_other_user_finds_public_quiz_cannot_edit_copies_and_renames_copy_only(page, page2):
    """Spec 1/2.1: user resources are public; a copy is a new resource owned by the copier; original untouched."""  # Spec 1
    _new_user(page)
    title = _name("pub")
    copy_title = title + "_mycopy"
    _create_quiz(page, title)

    _new_user(page2)
    page2.goto("/user/search")
    page2.get_by_test_id("global-search-input").fill(title)
    result = page2.locator(f'[data-result-title="{title}"]')
    expect(result).to_be_visible()
    result.locator("[data-testid^='search-clone-']").click()
    expect(result).to_contain_text("Added")
    result.locator("[data-testid^='search-result-link-']").click()
    expect(page2.get_by_test_id("quiz-title")).to_contain_text(title)
    expect(page2.get_by_test_id("quiz-edit-toggle")).to_have_count(0)

    page2.goto("/user/library")
    expect(_lib_item(page2, title)).to_be_visible()
    _lib_item(page2, title).get_by_test_id("library-item-title").click()
    expect(page2.get_by_test_id("quiz-edit-toggle")).to_be_visible()
    page2.get_by_test_id("quiz-edit-toggle").click()
    page2.get_by_test_id("quiz-edit-title-input").fill(copy_title)
    page2.get_by_test_id("quiz-edit-save-btn").click()
    expect(page2.get_by_test_id("quiz-edit-success")).to_have_text("Quiz saved.")
    page2.reload()
    expect(page2.get_by_test_id("quiz-title")).to_contain_text(copy_title)

    page.goto("/user/library")
    original = _lib_item(page, title)
    expect(original).to_be_visible()
    expect(original.get_by_test_id("library-item-title")).to_have_text(title)
    original.get_by_test_id("library-item-title").click()
    expect(page.get_by_test_id("quiz-title")).to_have_text(title)


def test_user_history_lists_played_quiz_and_opened_document(page, tmp_path):
    """Spec 4.3 (progress is automatic): playing a quiz and opening a document appear in learning history."""  # Spec 4.3
    _new_user(page)
    quiz, doc = _name("hq"), _name("hdoc")
    _create_quiz(page, quiz)
    _lib_item(page, quiz).get_by_test_id("library-item-title").click()
    page.get_by_role("button", name=f"{quiz} a", exact=True).click()
    page.get_by_test_id("quiz-play-submit").click()
    expect(page.get_by_test_id("quiz-play-score")).to_contain_text("100%")

    _upload_pdf(page, tmp_path, doc)
    _lib_item(page, doc).get_by_test_id("library-item-title").click()
    expect(page.get_by_test_id("document-pdf-frame")).to_be_visible()

    page.goto("/user/learning")
    expect(page.get_by_test_id("history-row").filter(has_text=quiz)).to_contain_text("Score: 100%")
    expect(page.get_by_test_id("history-row").filter(has_text=doc)).to_be_visible()


AI_SOURCE = (
    "Photosynthesis is the process by which green plants make their own food. It takes place in the chloroplasts, "
    "which contain a green pigment called chlorophyll. Chlorophyll absorbs light energy from the sun. The plant takes "
    "in carbon dioxide from the air through small openings in the leaves called stomata, and water from the soil "
    "through its roots. Using light energy, the plant turns carbon dioxide and water into glucose and oxygen. "
    "Glucose is the sugar the plant uses for energy and growth. Oxygen is released into the air as a by-product. "
    "Photosynthesis happens mainly in the leaves and only when light is available."
)


@pytest.mark.ai
@pytest.mark.slow
@pytest.mark.timeout(600)
def test_user_generates_ai_quiz_from_document_reviews_draft_and_publishes(page, page2, tmp_path):
    """Spec 2.1: AI quiz from an uploaded document; every question has an explanation; saved as DRAFT, owner-only until published."""  # Spec 2.1
    _new_user(page)
    title = _name("aiquiz")
    src = tmp_path / "photosynthesis.txt"
    src.write_text(AI_SOURCE, encoding="utf-8")

    page.goto("/user/quizzes/new")
    page.get_by_test_id("quiz-title-input").fill(title)
    page.get_by_test_id("quiz-mode-ai").click()
    page.get_by_test_id("quiz-ai-file-input").set_input_files(str(src))
    page.get_by_test_id("quiz-ai-generate-btn").click()
    expect(page.get_by_test_id("quiz-ai-question-0-text")).to_be_visible(timeout=480_000)
    expect(page.get_by_test_id("quiz-ai-question-0-text")).not_to_have_value("")
    explanations = page.locator("[data-testid^='quiz-ai-question-'][data-testid$='-explanation']").all()
    assert len(explanations) >= 3, f"AI returned only {len(explanations)} questions"
    for e in explanations:
        expect(e).not_to_have_value("")

    page.get_by_test_id("quiz-ai-save-btn").click()
    expect(page).to_have_url(re.compile(r"/user/library$"))
    _lib_item(page, title).get_by_test_id("library-item-title").click()
    expect(page.get_by_test_id("quiz-title")).to_contain_text(title)
    expect(page.get_by_test_id("quiz-draft-badge")).to_be_visible()

    # Another user cannot find the draft.
    _new_user(page2)
    page2.goto("/user/search")
    page2.get_by_test_id("global-search-input").fill(title)
    expect(page2.get_by_text("No results found")).to_be_visible()
    expect(page2.locator(f'[data-result-title="{title}"]')).to_have_count(0)

    page.get_by_test_id("quiz-publish-btn").click()
    expect(page.get_by_test_id("quiz-draft-badge")).to_have_count(0)
    page.reload()
    expect(page.get_by_test_id("quiz-title")).to_contain_text(title)
    expect(page.get_by_test_id("quiz-draft-badge")).to_have_count(0)
    expect(page.get_by_test_id("quiz-publish-btn")).to_have_count(0)

    page2.reload()
    page2.get_by_test_id("global-search-input").fill(title)
    expect(page2.locator(f'[data-result-title="{title}"]')).to_be_visible()
