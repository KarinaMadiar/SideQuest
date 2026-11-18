import pytest
from datetime import datetime, timedelta, timezone


@pytest.mark.asyncio
async def test_sidequest_lifecycle_and_business_rules(client):
    # Register 3 users: creator, user2, user3
    await client.post("/api/v1/auth/register", json={
        "email": "creator@ucu.edu.ua", "password": "Password123!", "name": "Організатор Квесту"
    })
    creator_login = await client.post("/api/v1/auth/login", json={
        "email": "creator@ucu.edu.ua", "password": "Password123!"
    })
    creator_token = creator_login.json()["access_token"]
    creator_headers = {"Authorization": f"Bearer {creator_token}"}

    await client.post("/api/v1/auth/register", json={
        "email": "user2@ucu.edu.ua", "password": "Password123!", "name": "Другий Студент"
    })
    u2_login = await client.post("/api/v1/auth/login", json={
        "email": "user2@ucu.edu.ua", "password": "Password123!"
    })
    u2_token = u2_login.json()["access_token"]
    u2_headers = {"Authorization": f"Bearer {u2_token}"}

    await client.post("/api/v1/auth/register", json={
        "email": "user3@ucu.edu.ua", "password": "Password123!", "name": "Третій Студент"
    })
    u3_login = await client.post("/api/v1/auth/login", json={
        "email": "user3@ucu.edu.ua", "password": "Password123!"
    })
    u3_token = u3_login.json()["access_token"]
    u3_headers = {"Authorization": f"Bearer {u3_token}"}

    now = datetime.now(timezone.utc)

    # 1. Reject past start time
    past_resp = await client.post("/api/v1/sidequests", headers=creator_headers, json={
        "title": "Минулий квест",
        "description": "Цей квест запланований у минулому.",
        "category": "coffee",
        "starts_at": (now - timedelta(hours=5)).isoformat(),
        "location": "Трапезна",
        "capacity": 2
    })
    assert past_resp.status_code == 422

    # 2. Reject end time before start time
    bad_time_resp = await client.post("/api/v1/sidequests", headers=creator_headers, json={
        "title": "Невірний час",
        "description": "Завершується раніше початку.",
        "category": "coffee",
        "starts_at": (now + timedelta(hours=5)).isoformat(),
        "ends_at": (now + timedelta(hours=3)).isoformat(),
        "location": "Трапезна",
        "capacity": 2
    })
    assert bad_time_resp.status_code == 422

    # 3. Create valid SideQuest with capacity 2 (creator auto-joins, so 1 spot left)
    create_resp = await client.post("/api/v1/sidequests", headers=creator_headers, json={
        "title": "Кава з одногрупниками",
        "description": "Обговорюємо домашки та проєкти з програмування.",
        "category": "coffee",
        "starts_at": (now + timedelta(days=1)).isoformat(),
        "location": "Трапезна УКУ",
        "capacity": 2
    })
    assert create_resp.status_code == 201
    sq = create_resp.json()
    sq_id = sq["id"]
    assert sq["status"] == "open"
    assert sq["participant_count"] == 1
    assert sq["capacity"] == 2

    # 4. User 2 joins (fills the capacity)
    join_resp = await client.post(f"/api/v1/sidequests/{sq_id}/join", headers=u2_headers)
    assert join_resp.status_code == 200
    sq_after_u2 = join_resp.json()
    assert sq_after_u2["participant_count"] == 2
    assert sq_after_u2["status"] == "full"

    # 5. User 2 tries duplicate join -> rejected
    dup_join = await client.post(f"/api/v1/sidequests/{sq_id}/join", headers=u2_headers)
    assert dup_join.status_code == 400
    assert "вже приєдналися" in dup_join.json()["detail"]

    # 6. User 3 tries to join full SideQuest -> rejected (capacity rule)
    overflow_resp = await client.post(f"/api/v1/sidequests/{sq_id}/join", headers=u3_headers)
    assert overflow_resp.status_code == 400
    assert "заповнено" in overflow_resp.json()["detail"]

    # 7. Non-creator cannot cancel or edit
    hacker_edit = await client.patch(f"/api/v1/sidequests/{sq_id}", headers=u3_headers, json={
        "title": "Зламаний квест"
    })
    assert hacker_edit.status_code == 403

    hacker_cancel = await client.delete(f"/api/v1/sidequests/{sq_id}", headers=u3_headers)
    assert hacker_cancel.status_code == 403

    # 8. Creator cancels SideQuest
    cancel_resp = await client.delete(f"/api/v1/sidequests/{sq_id}", headers=creator_headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "canceled"

    # 9. User 2 leaves, but joining canceled sidequest must be rejected
    await client.delete(f"/api/v1/sidequests/{sq_id}/join", headers=u2_headers)
    join_canceled = await client.post(f"/api/v1/sidequests/{sq_id}/join", headers=u3_headers)
    assert join_canceled.status_code == 400
    assert "скасовано" in join_canceled.json()["detail"]
