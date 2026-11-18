from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union, Dict
import bcrypt
import jwt
from jwt import PyJWKClient
import httpx
from app.config import settings

# Cache PyJWKClient instances by JWKS URI
_jwk_clients: Dict[str, PyJWKClient] = {}


def get_jwk_client(jwks_uri: str) -> PyJWKClient:
    if jwks_uri not in _jwk_clients:
        _jwk_clients[jwks_uri] = PyJWKClient(jwks_uri, cache_keys=True)
    return _jwk_clients[jwks_uri]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "token_source": "local"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_cognito_access_token(token: str) -> Optional[dict]:
    """
    Validates an Amazon Cognito JWT access token using the configured User Pool
    issuer and JWKS signing keys.
    Verifies:
      - RS256 signature against Cognito JWKS
      - issuer (iss) matches https://cognito-idp.<region>.amazonaws.com/<pool_id>
      - expiration (exp)
      - token_use == "access"
      - client_id matches COGNITO_CLIENT_ID
      - sub is present
    """
    if not settings.is_cognito_configured:
        return None

    try:
        unverified_header = jwt.get_unverified_header(token)
        if unverified_header.get("alg") != "RS256":
            return None

        jwk_client = get_jwk_client(settings.cognito_jwks_uri)
        signing_key = jwk_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.cognito_issuer,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": False,  # Cognito access tokens use 'client_id' instead of 'aud'
                "require": ["exp", "iss", "sub", "token_use"],
            },
        )

        # Verify token_use is specifically an access token
        if payload.get("token_use") != "access":
            return None

        # Verify client_id matches configured Cognito App Client ID
        token_client_id = payload.get("client_id") or payload.get("aud")
        if token_client_id != settings.COGNITO_CLIENT_ID:
            return None

        payload["token_source"] = "cognito"
        return payload
    except Exception:
        return None


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates either a Cognito RS256 access token (when Cognito is configured
    and the token uses RS256) or a local HS256 JWT token.
    """
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        return None

    alg = header.get("alg")
    if alg == "RS256":
        return decode_cognito_access_token(token)

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        payload.setdefault("token_source", "local")
        return payload
    except jwt.PyJWTError:
        return None


async def fetch_cognito_userinfo(access_token: str) -> Optional[dict]:
    """
    Fetches OIDC userinfo from the Cognito Hosted UI /oauth2/userInfo endpoint
    using the validated Cognito access token.
    """
    if not settings.COGNITO_DOMAIN:
        return None

    domain = settings.COGNITO_DOMAIN.strip().rstrip("/")
    if not domain.startswith("https://") and not domain.startswith("http://"):
        domain = f"https://{domain}"

    userinfo_url = f"{domain}/oauth2/userInfo"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        return None
    return None
