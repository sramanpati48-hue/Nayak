import asyncio
import json
import unittest
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.db.base import Base
from app.db.models import NyaybandhuSession, TranscriptEvent
from app.db.session import SessionLocal, engine
from app.main import app


def auth_headers(role: str, user_id: str) -> dict[str, str]:
    return {
        "X-User-Role": role,
        "X-User-Id": user_id,
    }


async def seed_clarification_card(session_id: str) -> str:
    async with SessionLocal() as db:
        card_id = str(uuid.uuid4())
        db.add(
            TranscriptEvent(
                id=card_id,
                session_id=session_id,
                speaker="Challenge Review",
                role="respondent",
                text="Please clarify the documentary record.",
                event_type="clarification_request",
                card_data={
                    "id": "card-verify",
                    "question": "Do you have a written agreement or receipts?",
                    "options": ["Yes", "No"],
                    "side": "left",
                    "answered": False,
                },
            )
        )
        await db.commit()
        return card_id


class TestNyaybandhuRbacApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        async def prepare_db():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

        asyncio.run(prepare_db())

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        asyncio.run(engine.dispose())

    def setUp(self):
        self._session_ids: list[str] = []

    def tearDown(self):
        async def cleanup():
            async with SessionLocal() as db:
                if self._session_ids:
                    await db.execute(delete(TranscriptEvent).where(TranscriptEvent.session_id.in_(self._session_ids)))
                    await db.execute(delete(NyaybandhuSession).where(NyaybandhuSession.id.in_(self._session_ids)))
                await db.commit()

        asyncio.run(cleanup())

    def create_case(self, *, role: str, user_id: str, title: str, mode: str = "practice"):
        payload = {
            "title": title,
            "description": "RBAC verification workspace",
            "mode": mode,
            "opposing_counsel_strategy": "precedent",
            "config": {
                "rbac": {
                    "creator_user_id": user_id,
                    "creator_role": role,
                    "assigned_roles": ["law_intern", "lawyer", "judge"],
                }
            },
        }
        response = self.client.post(
            "/api/v1/nyaybandhu/sessions",
            headers={**auth_headers(role, user_id), "Content-Type": "application/json"},
            content=json.dumps(payload),
        )
        if response.status_code == 201:
            self._session_ids.append(response.json()["id"])
        return response

    def test_role_permission_matrix_create_case(self):
        matrix = {
            "normal_user": 201,
            "law_intern": 403,
            "lawyer": 403,
            "judge": 403,
        }

        for role, expected in matrix.items():
            with self.subTest(role=role):
                response = self.create_case(role=role, user_id=f"create-{role}", title=f"RBAC Create {role}")
                self.assertEqual(response.status_code, expected)

    def test_view_own_and_assigned_cases(self):
        owner_id = "owner-001"
        response = self.create_case(role="normal_user", user_id=owner_id, title="RBAC View Case")
        self.assertEqual(response.status_code, 201)
        session_id = response.json()["id"]

        own_response = self.client.get(
            f"/api/v1/nyaybandhu/sessions/{session_id}",
            headers=auth_headers("normal_user", owner_id),
        )
        self.assertEqual(own_response.status_code, 200)

        for role in ["law_intern", "lawyer", "judge"]:
            with self.subTest(role=role):
                assigned_response = self.client.get(
                    f"/api/v1/nyaybandhu/sessions/{session_id}",
                    headers=auth_headers(role, f"{role}-viewer"),
                )
                self.assertEqual(assigned_response.status_code, 200)

        denied_response = self.client.get(
            f"/api/v1/nyaybandhu/sessions/{session_id}",
            headers=auth_headers("normal_user", "different-user"),
        )
        self.assertEqual(denied_response.status_code, 403)

    def test_answer_cross_questions_permissions(self):
        owner_id = "answer-owner"
        response = self.create_case(role="normal_user", user_id=owner_id, title="RBAC Answer Case")
        self.assertEqual(response.status_code, 201)
        session_id = response.json()["id"]
        card_id = asyncio.run(seed_clarification_card(session_id))

        answer_matrix = {
            "normal_user": owner_id,
            "law_intern": "law-intern-answer",
            "lawyer": "lawyer-answer",
        }

        for role, user_id in answer_matrix.items():
            with self.subTest(role=role):
                answer_response = self.client.post(
                    f"/api/v1/nyaybandhu/sessions/{session_id}/answer",
                    headers={**auth_headers(role, user_id), "Content-Type": "application/json"},
                    content=json.dumps({"card_id": card_id, "selected_option": "Yes"}),
                )
                self.assertEqual(answer_response.status_code, 200)

        judge_response = self.client.post(
            f"/api/v1/nyaybandhu/sessions/{session_id}/answer",
            headers={**auth_headers("judge", "judge-answer"), "Content-Type": "application/json"},
            content=json.dumps({"card_id": card_id, "selected_option": "Yes"}),
        )
        self.assertEqual(judge_response.status_code, 403)

    def test_export_and_finalize_permissions(self):
        owner_response = self.create_case(role="normal_user", user_id="final-owner", title="RBAC Finalize Case")
        self.assertEqual(owner_response.status_code, 201)
        session_id = owner_response.json()["id"]

        normal_user_finalize = self.client.post(
            f"/api/v1/nyaybandhu/sessions/{session_id}/finalize",
            headers=auth_headers("normal_user", "final-owner"),
        )
        self.assertEqual(normal_user_finalize.status_code, 200)

        lawyer_owner_response = self.create_case(role="normal_user", user_id="lawyer-owner", title="RBAC Lawyer Finalize")
        self.assertEqual(lawyer_owner_response.status_code, 201)
        lawyer_session_id = lawyer_owner_response.json()["id"]

        lawyer_finalize = self.client.post(
            f"/api/v1/nyaybandhu/sessions/{lawyer_session_id}/finalize",
            headers=auth_headers("lawyer", "lawyer-final"),
        )
        self.assertEqual(lawyer_finalize.status_code, 200)

        intern_response = self.create_case(role="normal_user", user_id="intern-owner", title="RBAC Intern Finalize")
        self.assertEqual(intern_response.status_code, 201)
        intern_session_id = intern_response.json()["id"]

        intern_finalize = self.client.post(
            f"/api/v1/nyaybandhu/sessions/{intern_session_id}/finalize",
            headers=auth_headers("law_intern", "intern-viewer"),
        )
        self.assertEqual(intern_finalize.status_code, 403)

        judge_finalize = self.client.post(
            f"/api/v1/nyaybandhu/sessions/{intern_session_id}/finalize",
            headers=auth_headers("judge", "judge-viewer"),
        )
        self.assertEqual(judge_finalize.status_code, 403)

    def test_intern_notes_and_lawyer_completion_permissions(self):
        response = self.create_case(role="normal_user", user_id="note-owner", title="RBAC Notes Case")
        self.assertEqual(response.status_code, 201)
        session_id = response.json()["id"]

        intern_note = self.client.post(
            f"/api/v1/nyaybandhu/sessions/{session_id}/intern-notes",
            headers={**auth_headers("law_intern", "intern-notes"), "Content-Type": "application/json"},
            content=json.dumps({"note": "Missing receipt should be tracked."}),
        )
        self.assertEqual(intern_note.status_code, 200)

        for role in ["normal_user", "lawyer", "judge"]:
            with self.subTest(role=role):
                denied = self.client.post(
                    f"/api/v1/nyaybandhu/sessions/{session_id}/intern-notes",
                    headers={**auth_headers(role, f"{role}-note"), "Content-Type": "application/json"},
                    content=json.dumps({"note": "Should be denied."}),
                )
                self.assertEqual(denied.status_code, 403)

        lawyer_review = self.client.post(
            f"/api/v1/nyaybandhu/sessions/{session_id}/lawyer-review-complete",
            headers={**auth_headers("lawyer", "lawyer-review"), "Content-Type": "application/json"},
            content=json.dumps({"summary": "Ready for lawyer sign-off."}),
        )
        self.assertEqual(lawyer_review.status_code, 200)

        for role in ["normal_user", "law_intern", "judge"]:
            with self.subTest(role=role):
                denied = self.client.post(
                    f"/api/v1/nyaybandhu/sessions/{session_id}/lawyer-review-complete",
                    headers={**auth_headers(role, f"{role}-review"), "Content-Type": "application/json"},
                    content=json.dumps({"summary": "Should be denied."}),
                )
                self.assertEqual(denied.status_code, 403)

    def test_direct_url_access_and_assigned_judge_workspace(self):
        response = self.create_case(role="normal_user", user_id="judge-owner", title="RBAC Judge Case")
        self.assertEqual(response.status_code, 201)
        session_id = response.json()["id"]

        judge_access = self.client.get(
            f"/api/v1/nyaybandhu/sessions/{session_id}",
            headers=auth_headers("judge", "judge-viewer"),
        )
        self.assertEqual(judge_access.status_code, 200)
        self.assertIn("rbac", judge_access.json()["session"].get("config", {}))

        outsider_access = self.client.get(
            f"/api/v1/nyaybandhu/sessions/{session_id}",
            headers=auth_headers("normal_user", "outsider"),
        )
        self.assertEqual(outsider_access.status_code, 403)


if __name__ == "__main__":
    unittest.main()
