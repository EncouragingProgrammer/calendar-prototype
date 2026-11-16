"""Focused tests for the portable Discover Estevan Python backend."""

# I now import the standard-library test tools so no extra test framework is required.
import tempfile
import unittest
from pathlib import Path

# I now import the application factory and database helpers under test.
from app import create_app
import db
from scraper.filters import keep_event


class BackendTests(unittest.TestCase):
    """Verify the API contract, review gate, and quality filter."""

    def setUp(self):
        # I now create a private temporary database so tests never change calendar.db.
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_dir.name) / "test-calendar.db"
        self.application = create_app(
            {
                "TESTING": True,
                "DB_PATH": self.database_path,
            }
        )
        self.client = self.application.test_client()

        # I now insert one approved event and one pending event for API checks.
        db.save_event(
            {
                "title": "Approved Community Walk",
                "start_time": "2099-06-01T10:00:00",
                "source_name": "Test Source",
                "source_url": "https://example.com/approved",
                "category": "Community",
            },
            self.database_path,
        )
        # I now mark the first fixture approved so it represents public calendar data.
        with db.connect(self.database_path) as connection:
            connection.execute(
                "UPDATE events SET status = 'approved' WHERE source_url = ?",
                ["https://example.com/approved"],
            )
        db.save_event(
            {
                "title": "Pending Art Workshop",
                "start_time": "2099-06-02T10:00:00",
                "source_name": "Test Source",
                "source_url": "https://example.com/pending",
                "category": "Arts",
            },
            self.database_path,
        )

    def tearDown(self):
        # I now remove the temporary database after each test case.
        self.temp_dir.cleanup()

    def test_health_and_default_approved_list(self):
        # I now confirm that the service health endpoint responds with JSON.
        health_response = self.client.get("/health")
        self.assertEqual(health_response.status_code, 200)
        self.assertEqual(health_response.json["status"], "ok")

        # I now confirm that the public list defaults to approved events only.
        response = self.client.get("/api/events")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), 1)
        self.assertEqual(response.json[0]["status"], "approved")

    def test_pending_filter_and_search(self):
        # I now confirm that reviewers can request pending records and filter by category.
        response = self.client.get("/api/events?status=pending&category=Arts&q=workshop")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), 1)
        self.assertEqual(response.json[0]["title"], "Pending Art Workshop")

    def test_review_changes_pending_event_to_approved(self):
        # I now find the pending event through the documented API.
        pending_response = self.client.get("/api/events?status=pending")
        event_id = pending_response.json[0]["id"]

        # I now submit a valid reviewer decision with notes.
        review_response = self.client.post(
            f"/api/events/{event_id}/review",
            json={"status": "approved", "notes": "Confirmed for the demo."},
        )
        self.assertEqual(review_response.status_code, 200)

        # I now confirm the decision is visible in the stored event.
        event_response = self.client.get(f"/api/events/{event_id}")
        self.assertEqual(event_response.json["status"], "approved")
        self.assertEqual(event_response.json["review_notes"], "Confirmed for the demo.")
        self.assertIsNotNone(event_response.json["reviewed_at"])

    def test_invalid_review_is_rejected(self):
        # I now confirm unsupported review statuses return a clear client error.
        response = self.client.post(
            "/api/events/1/review",
            json={"status": "published"},
        )
        self.assertEqual(response.status_code, 400)

    def test_quality_filter_rejects_past_and_blocked_events(self):
        # I now confirm old records cannot enter the review queue.
        accepted, reason = keep_event(
            {
                "title": "Old Event",
                "start_time": "2020-01-01T10:00:00",
                "source_url": "https://example.com/old",
            }
        )
        self.assertFalse(accepted)
        self.assertEqual(reason, "event is in the past")

        # I now confirm obvious promotional spam is rejected before persistence.
        accepted, reason = keep_event(
            {
                "title": "BUY CHEAP watches",
                "start_time": "2099-01-01T10:00:00",
                "source_url": "https://example.com/spam",
            }
        )
        self.assertFalse(accepted)
        self.assertIn("blocked word", reason)


if __name__ == "__main__":
    # I now allow this test file to run directly with the standard Python command.
    unittest.main()
