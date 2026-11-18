import pytest
import jwt
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock, AsyncMock
from cryptography.hazmat.primitives.asymmetric import rsa
from app.config import settings, Settings
from app.database import normalize_async_db_url


def test_normalize_async_db_url_and_cors_parsing():
    # 1. Neon postgres:// with sslmode=require & channel_binding=require
    raw_neon = "postgres://user:pass@ep-cool-forest-123.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    norm_url, connect_args = normalize_async_db_url(raw_neon)
    assert norm_url == "postgresql+asyncpg://user:pass@ep-cool-forest-123.eu-central-1.aws.neon.tech/neondb"
    assert "ssl" in connect_args

    # 2. Comma-separated CORS_ORIGINS and FRONTEND_URL
    custom_settings = Settings(
        CORS_ORIGINS="http://localhost:3000, https://main.d12345.amplifyapp.com/",
        FRONTEND_URL="https://sidequest.ucu.edu.ua/",
    )
    assert "http://localhost:3000" in custom_settings.effective_cors_origins
    assert "https://main.d12345.amplifyapp.com" in custom_settings.effective_cors_origins
    assert "https://sidequest.ucu.edu.ua" in custom_settings.effective_cors_origins


def _generate_rsa_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    return private_key, public_key


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
    assert data["user"]["auth_provider"] == "local"

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


@pytest.mark.asyncio
async def test_cognito_google_federation_and_security(client, monkeypatch):
    """
    Tests Amazon Cognito Google federated sign-in token validation, user creation/sync,
    and strict account-linking / security boundaries:
    1. Valid Cognito RS256 access token creates/synchronizes a SideQuest user with `cognito_sub`.
    2. Subsequent calls with the same `sub` return the same SideQuest user profile.
    3. Tokens with wrong issuer, wrong client_id, or `token_use != "access"` (e.g. id token) are rejected.
    4. Existing email/password accounts are NOT silently merged when a Cognito Google user has the same email.
    5. Frontend-supplied role/id fields are ignored during `/auth/cognito/sync`.
    """
    private_key, public_key = _generate_rsa_keypair()

    pool_id = "eu-central-1_TestPool99"
    client_id = "test-cognito-app-client-id-123"
    issuer = f"https://cognito-idp.eu-central-1.amazonaws.com/{pool_id}"

    monkeypatch.setattr(settings, "AWS_REGION", "eu-central-1")
    monkeypatch.setattr(settings, "COGNITO_USER_POOL_ID", pool_id)
    monkeypatch.setattr(settings, "COGNITO_CLIENT_ID", client_id)
    monkeypatch.setattr(settings, "COGNITO_DOMAIN", "ucu-sidequest-test.auth.eu-central-1.amazoncognito.com")
    monkeypatch.setattr(settings, "GOOGLE_SIGNIN_ENABLED", True)

    mock_signing_key = MagicMock()
    mock_signing_key.key = public_key
    mock_jwk_client = MagicMock()
    mock_jwk_client.get_signing_key_from_jwt.return_value = mock_signing_key

    now = datetime.now(timezone.utc)
    cognito_sub = "a1b2c3d4-5678-90ab-cdef-111122223333"

    valid_claims = {
        "sub": cognito_sub,
        "iss": issuer,
        "client_id": client_id,
        "token_use": "access",
        "scope": "openid email profile",
        "username": "Google_109876543210",
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "iat": int(now.timestamp()),
    }
    valid_access_token = jwt.encode(valid_claims, private_key, algorithm="RS256", headers={"kid": "test-kid-1"})

    mock_userinfo = {
        "sub": cognito_sub,
        "email": "google.student@ucu.edu.ua",
        "email_verified": "true",
        "name": "Соломія Крушельницька",
        "picture": "https://lh3.googleusercontent.com/a/default-user",
        "username": "Google_109876543210",
    }

    with patch("app.utils.security.get_jwk_client", return_value=mock_jwk_client), \
         patch("app.services.auth_service.fetch_cognito_userinfo", new=AsyncMock(return_value=mock_userinfo)):

        # 1. First sign-in via /api/v1/auth/cognito/sync creates the user profile
        # Even if a malicious client sends role="admin" in body, it is ignored
        sync_resp = await client.post(
            "/api/v1/auth/cognito/sync",
            headers={"Authorization": f"Bearer {valid_access_token}"},
            json={"role": "admin", "id": "hacked-id", "email": "admin@ucu.edu.ua"}
        )
        assert sync_resp.status_code == 200
        synced_user = sync_resp.json()
        assert synced_user["email"] == "google.student@ucu.edu.ua"
        assert synced_user["name"] == "Соломія Крушельницька"
        assert synced_user["cognito_sub"] == cognito_sub
        assert synced_user["auth_provider"] == "google"
        assert synced_user["role"] == "student"  # Never "admin"
        assert synced_user["id"] != "hacked-id"

        # 2. Calling /api/v1/me with the Cognito access token returns the same synchronized user
        me_resp = await client.get(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {valid_access_token}"}
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["id"] == synced_user["id"]

        # 3. Calling protected endpoint (e.g. create sidequest) with Cognito access token works
        sq_resp = await client.post(
            "/api/v1/sidequests",
            headers={"Authorization": f"Bearer {valid_access_token}"},
            json={
                "title": "Кава після входу через Google",
                "description": "Тестуємо створення квесту з Cognito токеном.",
                "category": "coffee",
                "starts_at": (now + timedelta(days=1)).isoformat(),
                "location": "Трапезна УКУ",
                "capacity": 4
            }
        )
        assert sq_resp.status_code == 201
        assert sq_resp.json()["creator"]["id"] == synced_user["id"]

        # 4. Reject ID token used in place of Access token (token_use == "id")
        id_token_claims = {**valid_claims, "token_use": "id", "aud": client_id}
        id_token = jwt.encode(id_token_claims, private_key, algorithm="RS256", headers={"kid": "test-kid-1"})
        bad_use_resp = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {id_token}"})
        assert bad_use_resp.status_code == 401

        # 5. Reject token from wrong issuer
        wrong_iss_claims = {**valid_claims, "iss": "https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_WrongPool"}
        wrong_iss_token = jwt.encode(wrong_iss_claims, private_key, algorithm="RS256", headers={"kid": "test-kid-1"})
        bad_iss_resp = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {wrong_iss_token}"})
        assert bad_iss_resp.status_code == 401

        # 6. Reject token with wrong client_id
        wrong_client_claims = {**valid_claims, "client_id": "wrong-app-client-id"}
        wrong_client_token = jwt.encode(wrong_client_claims, private_key, algorithm="RS256", headers={"kid": "test-kid-1"})
        bad_client_resp = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {wrong_client_token}"})
        assert bad_client_resp.status_code == 401

        # 7. Do NOT silently merge with an existing email/password account
        await client.post("/api/v1/auth/register", json={
            "email": "existing.local@ucu.edu.ua",
            "password": "Password123!",
            "name": "Локальний Користувач",
            "role": "student"
        })

        conflict_sub = "conflict-sub-9999-8888-7777"
        conflict_claims = {**valid_claims, "sub": conflict_sub}
        conflict_token = jwt.encode(conflict_claims, private_key, algorithm="RS256", headers={"kid": "test-kid-1"})
        conflict_userinfo = {
            "sub": conflict_sub,
            "email": "existing.local@ucu.edu.ua",
            "name": "Google Дублікат",
            "username": "Google_999999",
        }

        with patch("app.services.auth_service.fetch_cognito_userinfo", new=AsyncMock(return_value=conflict_userinfo)):
            conflict_resp = await client.post(
                "/api/v1/auth/cognito/sync",
                headers={"Authorization": f"Bearer {conflict_token}"}
            )
            assert conflict_resp.status_code == 409
            assert "Автоматичне об'єднання акаунтів вимкнено" in conflict_resp.json()["detail"]
