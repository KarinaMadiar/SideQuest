import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    # 1. Register student
    reg_payload = {
        "email": "newstudent@ucu.edu.ua",
        "password": "Password123!",
        "name": "Новий Студент",
        "role": "student"
    }
    resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newstudent@ucu.edu.ua"
    assert data["user"]["role"] == "student"

    # 2. Duplicate registration rejected
    resp_dup = await client.post("/api/v1/auth/register", json=reg_payload)
    assert resp_dup.status_code == 400
    assert "вже зареєстрований" in resp_dup.json()["detail"]

    # 3. Login with correct password
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "newstudent@ucu.edu.ua",
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # 4. Login with wrong password
    bad_login = await client.post("/api/v1/auth/login", json={
        "email": "newstudent@ucu.edu.ua",
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

    # 5. Access /me with token
    me_resp = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "newstudent@ucu.edu.ua"

    # 6. Access /me without token
    unauth_resp = await client.get("/api/v1/me")
    assert unauth_resp.status_code == 401
