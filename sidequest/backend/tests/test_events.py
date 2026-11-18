import pytest
from datetime import datetime, timedelta, timezone


@pytest.mark.asyncio
async def test_events_role_checks_and_flow(client):
    # 1. Register student
    await client.post("/api/v1/auth/register", json={
        "email": "student_user@ucu.edu.ua", "password": "Password123!", "name": "Студент Тестер", "role": "student"
    })
    s_login = await client.post("/api/v1/auth/login", json={
        "email": "student_user@ucu.edu.ua", "password": "Password123!"
    })
    student_headers = {"Authorization": f"Bearer {s_login.json()['access_token']}"}

    # 2. Register organizer
    await client.post("/api/v1/auth/register", json={
        "email": "org_user@ucu.edu.ua", "password": "Password123!", "name": "Організатор Тестер", "role": "organizer"
    })
    org_login = await client.post("/api/v1/auth/login", json={
        "email": "org_user@ucu.edu.ua", "password": "Password123!"
    })
    org_headers = {"Authorization": f"Bearer {org_login.json()['access_token']}"}

    now = datetime.now(timezone.utc)

    # 3. Student tries to create event -> 403 Forbidden
    student_create = await client.post("/api/v1/events", headers=student_headers, json={
        "title": "Студентська вечірка",
        "description": "Студент не має прав створювати університетські події.",
        "category": "social",
        "starts_at": (now + timedelta(days=2)).isoformat(),
        "ends_at": (now + timedelta(days=2, hours=3)).isoformat(),
        "location": "Колегіум"
    })
    assert student_create.status_code == 403

    # 4. Organizer creates event with speakers and preparation notes
    org_create = await client.post("/api/v1/events", headers=org_headers, json={
        "title": "Хакатон інновацій УКУ 2026",
        "description": "Щорічний хакатон студентських проєктів з AI та кібербезпеки.",
        "category": "workshop",
        "starts_at": (now + timedelta(days=5)).isoformat(),
        "ends_at": (now + timedelta(days=6)).isoformat(),
        "location": "Центр Шептицького",
        "registration_url": "https://hackathon.ucu.edu.ua",
        "why_attend": "Шанс отримати грант на розвиток та менторство від інженерів.",
        "preparation_notes": "Сформуйте команду або прийдіть самостійно на нетворкінг.",
        "speakers": [
            {
                "name": "Роман Гнатюк (демо)",
                "short_bio": "Технічний лідер AI-лабораторії.",
                "position": "AI Architect",
                "linkedin_url": "https://linkedin.com/in/demo-roman",
                "display_order": 1
            }
        ]
    })
    assert org_create.status_code == 201
    event = org_create.json()
    event_id = event["id"]
    assert len(event["speakers"]) == 1
    assert event["speakers"][0]["name"] == "Роман Гнатюк (демо)"

    # 5. Student attends event
    attend_resp = await client.post(f"/api/v1/events/{event_id}/attend", headers=student_headers)
    assert attend_resp.status_code == 200
    assert attend_resp.json()["attendee_count"] == 1
    assert attend_resp.json()["is_attending"] is True

    # 6. Duplicate attend -> 400
    dup_attend = await client.post(f"/api/v1/events/{event_id}/attend", headers=student_headers)
    assert dup_attend.status_code == 400

    # 7. Student leaves event
    leave_resp = await client.delete(f"/api/v1/events/{event_id}/attend", headers=student_headers)
    assert leave_resp.status_code == 200
    assert leave_resp.json()["attendee_count"] == 0
    assert leave_resp.json()["is_attending"] is False

    # 8. Organizer creates event with minimal fields (None for why_attend, prep, speakers)
    minimal_event = await client.post("/api/v1/events", headers=org_headers, json={
        "title": "Мінімальна подія",
        "description": "Подія без додаткових необов'язкових полів.",
        "category": "lecture",
        "starts_at": (now + timedelta(days=7)).isoformat(),
        "ends_at": (now + timedelta(days=7, hours=2)).isoformat(),
        "location": "Ауд. 202"
    })
    assert minimal_event.status_code == 201
    min_data = minimal_event.json()
    assert min_data["why_attend"] is None
    assert min_data["preparation_notes"] is None
    assert min_data["speakers"] == []
