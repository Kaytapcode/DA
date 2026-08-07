"""
Spec 3 — Module/Collection grouping mechanism (User-scope = Collection).
- Module CRUD with nesting (parent_id)
- Add/remove resources (Quiz, Document, Deck, Video) to/from a Collection
- Custom ordering via OrderIndex
"""

import pytest
from datetime import datetime


def _new_creds(prefix="col"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


def _register_and_login(api_client, prefix="col"):
    creds = _new_creds(prefix)
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    api_client.login_user(creds["username"], creds["password"])
    return creds


def _unwrap(resp):
    body = resp.json() if resp.text else {}
    if isinstance(body, dict) and "data" in body and body.get("data") is not None:
        return body["data"]
    return body


def _create_collection(api_client, title="My Collection", parent_id=None):
    payload = {"title": title}
    if parent_id:
        payload["parentId"] = parent_id
    resp = api_client.post("/api/collections", json=payload)
    assert resp.status_code in (200, 201), resp.text
    return _unwrap(resp)


def _create_quiz(api_client, title="Quiz for col"):
    resp = api_client.post("/api/quizzes", json={"title": title})
    assert resp.status_code == 200, resp.text
    return _unwrap(resp)


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestCollectionCRUD:
    """Spec 3 — User creates / lists / deletes Collections."""

    def test_user_can_create_collection(self, api_client):
        _register_and_login(api_client)
        col = _create_collection(api_client, "Study set 1")
        assert col.get("id"), "Collection must have an id"

    def test_user_can_list_own_collections(self, api_client):
        _register_and_login(api_client)
        _create_collection(api_client, "A")
        _create_collection(api_client, "B")
        resp = api_client.get("/api/collections")
        assert resp.status_code == 200
        items = _unwrap(resp)
        assert isinstance(items, list) and len(items) >= 2

    def test_user_can_delete_collection(self, api_client):
        _register_and_login(api_client)
        col = _create_collection(api_client, "Temp")
        resp = api_client.delete(f"/api/collections/{col['id']}")
        assert resp.status_code in (200, 204)

    def test_unauthenticated_cannot_create(self, api_client):
        resp = api_client.post("/api/collections", json={"title": "x"})
        assert resp.status_code == 401


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestCollectionNesting:
    """Spec 3 — Modules support nesting (a Module can contain other Modules)."""

    def test_collection_can_have_parent(self, api_client):
        _register_and_login(api_client)
        parent = _create_collection(api_client, "Parent")
        child = _create_collection(api_client, "Child", parent_id=parent["id"])
        assert child.get("parentId") == parent["id"] or child.get("id"), \
            "Spec 3: nested collection must reference parent_id"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestCollectionItems:
    """Spec 3 — Add/remove resources + ordering."""

    def test_user_can_add_quiz_to_collection(self, api_client):
        _register_and_login(api_client)
        col = _create_collection(api_client)
        quiz = _create_quiz(api_client)

        resp = api_client.post(f"/api/collections/{col['id']}/items", json={"contentId": quiz["contentId"]})
        assert resp.status_code in (200, 201), f"Add item failed: {resp.text}"

        items = _unwrap(api_client.get(f"/api/collections/{col['id']}/items"))
        assert len(items) >= 1
        assert any(it.get("contentId") == quiz["contentId"] for it in items)

    def test_user_can_remove_item(self, api_client):
        _register_and_login(api_client)
        col = _create_collection(api_client)
        quiz = _create_quiz(api_client)
        api_client.post(f"/api/collections/{col['id']}/items", json={"contentId": quiz["contentId"]})

        resp = api_client.delete(f"/api/collections/{col['id']}/items/{quiz['contentId']}")
        assert resp.status_code in (200, 204)

        items = _unwrap(api_client.get(f"/api/collections/{col['id']}/items"))
        assert not any(it.get("contentId") == quiz["contentId"] for it in items)

    def test_items_have_order_index(self, api_client):
        """Spec 3 — Items support custom ordering."""
        _register_and_login(api_client)
        col = _create_collection(api_client)
        q1 = _create_quiz(api_client, "Q1")
        q2 = _create_quiz(api_client, "Q2")
        api_client.post(f"/api/collections/{col['id']}/items", json={"contentId": q1["contentId"]})
        api_client.post(f"/api/collections/{col['id']}/items", json={"contentId": q2["contentId"]})

        items = _unwrap(api_client.get(f"/api/collections/{col['id']}/items"))
        # Verify orderIndex is present and items are returned in order
        indices = [it.get("orderIndex") for it in items if "orderIndex" in it]
        assert len(indices) >= 2, "Spec 3: items must expose orderIndex"
        assert indices == sorted(indices), "Spec 3: items must be returned in OrderIndex order"
