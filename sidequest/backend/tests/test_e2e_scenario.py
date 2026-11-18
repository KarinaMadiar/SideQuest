import pytest
from datetime import datetime, timedelta, timezone


@pytest.mark.asyncio
async def test_student_e2e_journey(client):
    """
    End-to-End Scenario:
    1. Host creates a SideQuest ('Ранкова кава в Шептицькому').
    2. A student registers and logs in.
    3. Student searches for 'кава' in SideQuests.
    4. Student views the SideQuest details.
    5. Student joins the SideQuest.
    6. Verifies participation and spot count update.
    7. Checks 'My Activities' endpoint to ensure it appears in joined activities.
    8. Student leaves the SideQuest, verifying spot is freed.
    """
    now = datetime.now(timezone.utc)

    # 1. Host creates SideQuest
    await client.post("/api/v1/auth/register", json={
        "email": "host@ucu.edu.ua", "password": "HostPassword123!", "name": "Остап Організатор", "role": "student"
    })
    host_login = await client.post("/api/v1/auth/login", json={
        "email": "host@ucu.edu.ua", "password": "HostPassword123!"
    })
    host_headers = {"Authorization": f"Bearer {host_login.json()['access_token']}"}

    create_resp = await client.post("/api/v1/sidequests", headers=host_headers, json={
        "title": "Ранкова кава в Шептицькому",
        "description": "Зустріч для знайомства перед першою парою.",
        "category": "coffee",
        "starts_at": (now + timedelta(days=2)).isoformat(),
        "location": "Трапезна Центру Шептицького",
        "capacity": 3
    })
    assert create_resp.status_code == 201
    sq_id = create_resp.json()["id"]

    # 2. Student registers and logs in
    reg_resp = await client.post("/api/v1/auth/register", json={
        "email": "newstudent_e2e@ucu.edu.ua",
        "password": "StudentPass123!",
        "name": "Андрій Спудей",
        "role": "student"
    })
    assert reg_resp.status_code == 201

    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "newstudent_e2e@ucu.edu.ua",
        "password": "StudentPass123!"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    # 3. Student searches for 'кава'
    search_resp = await client.get("/api/v1/sidequests?search=кава", headers=student_headers)
    assert search_resp.status_code == 200
    items = search_resp.json()["items"]
    assert len(items) >= 1
    found = [sq for sq in items if sq["id"] == sq_id][0]
    assert found["participant_count"] == 1
    assert found["is_joined"] is False

    # 4. Student views detail
    detail_resp = await client.get(f"/api/v1/sidequests/{sq_id}", headers=student_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["title"] == "Ранкова кава в Шептицькому"

    # 5. Student joins SideQuest
    join_resp = await client.post(f"/api/v1/sidequests/{sq_id}/join", headers=student_headers)
    assert join_resp.status_code == 200
    joined_sq = join_resp.json()
    assert joined_sq["participant_count"] == 2
    assert joined_sq["is_joined"] is True

    # 6. Check 'My Activities'
    my_activities = await client.get("/api/v1/me/sidequests?filter_type=joined", headers=student_headers)
    assert my_activities.status_code == 200
    my_items = my_activities.json()["items"]
    assert any(item["id"] == sq_id for item in my_items)

    # 7. Student leaves
    leave_resp = await client.delete(f"/api/v1/sidequests/{sq_id}/join", headers=student_headers)
    assert leave_resp.status_code == 200
    assert leave_resp.json()["participant_count"] == 1
    assert leave_resp.json()["is_joined"] is False
