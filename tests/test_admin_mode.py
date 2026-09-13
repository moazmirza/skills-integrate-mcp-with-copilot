import uuid

from fastapi.testclient import TestClient

from src.app import app


client = TestClient(app)


def test_valid_teacher_login():
    response = client.post(
        "/login",
        json={"username": "admin", "password": "admin123"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Login successful"


def test_student_sign_up_requires_teacher_login():
    response = client.post(
        "/activities/Chess Club/signup?email=student@mergington.edu"
    )

    assert response.status_code == 401


def test_teacher_can_manage_activity_signups():
    teacher_headers = {
        "X-Teacher-Username": "admin",
        "X-Teacher-Password": "admin123",
    }
    email = f"teacher_login_{uuid.uuid4().hex[:8]}@mergington.edu"

    signup_response = client.post(
        f"/activities/Chess Club/signup?email={email}",
        headers=teacher_headers,
    )
    assert signup_response.status_code == 200

    unregister_response = client.delete(
        f"/activities/Chess Club/unregister?email={email}",
        headers=teacher_headers,
    )
    assert unregister_response.status_code == 200
