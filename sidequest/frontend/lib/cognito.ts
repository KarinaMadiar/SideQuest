'use client';

/**
 * Amazon Cognito Hosted UI OAuth 2.0 + PKCE Client for Google Federated Sign-In.
 *
 * Security & Architecture:
 * - Uses only public configuration (User Pool ID, Public App Client ID, Hosted UI Domain).
 * - Never stores or uses a Google Client Secret or Cognito Client Secret in the browser.
 * - Uses Authorization Code Grant with PKCE (S256) and CSRF `state` verification.
 * - Requests only standard scopes: `openid email profile`.
 */

const PKCE_VERIFIER_KEY = 'sidequest_cognito_pkce_verifier';
const OAUTH_STATE_KEY = 'sidequest_cognito_oauth_state';
const POST_LOGIN_REDIRECT_KEY = 'sidequest_post_login_redirect';
const AUTH_PROVIDER_SESSION_KEY = 'sidequest_auth_provider';

export interface CognitoPublicConfig {
  enabled: boolean;
  userPoolId: string;
  clientId: string;
  domain: string;
  redirectUri: string;
  logoutUri: string;
  scopes: string;
  isConfigured: boolean;
}

const PLACEHOLDER_VALUES = new Set([
  '',
  'your-user-pool-id',
  'your-app-client-id',
  'eu-central-1_example',
  'exampleclientid123456',
  'https://your-domain.auth.eu-central-1.amazoncognito.com',
]);

function normalizeDomain(rawDomain: string): string {
  const trimmed = rawDomain.trim().replace(/\/+$/, '');
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed)) return '';
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

let runtimeConfigOverride: Partial<CognitoPublicConfig> | null = null;

export function updateCognitoConfig(override: Partial<CognitoPublicConfig>) {
  runtimeConfigOverride = { ...(runtimeConfigOverride || {}), ...override };
}

export function getCognitoConfig(): CognitoPublicConfig {
  let enabledFlag =
    (process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED || '').toLowerCase() === 'true' ||
    process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED === '1';

  let userPoolId = (process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '').trim();
  let clientId = (process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '').trim();
  let domain = normalizeDomain(process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '');

  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  let redirectUri = (
    process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || `${defaultOrigin}/auth/callback`
  ).trim();
  let logoutUri = (
    process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || `${defaultOrigin}/login`
  ).trim();
  let scopes = (process.env.NEXT_PUBLIC_COGNITO_SCOPES || 'openid email profile')
    .trim()
    .replace(/^["']|["']$/g, '');

  if (runtimeConfigOverride) {
    if (runtimeConfigOverride.enabled !== undefined) enabledFlag = runtimeConfigOverride.enabled;
    if (runtimeConfigOverride.userPoolId) userPoolId = runtimeConfigOverride.userPoolId;
    if (runtimeConfigOverride.clientId) clientId = runtimeConfigOverride.clientId;
    if (runtimeConfigOverride.domain) domain = normalizeDomain(runtimeConfigOverride.domain);
    if (runtimeConfigOverride.redirectUri) redirectUri = runtimeConfigOverride.redirectUri;
    if (runtimeConfigOverride.logoutUri) logoutUri = runtimeConfigOverride.logoutUri;
    if (runtimeConfigOverride.scopes) scopes = runtimeConfigOverride.scopes.replace(/^["']|["']$/g, '');
  }

  const hasValidPool = Boolean(userPoolId && !PLACEHOLDER_VALUES.has(userPoolId));
  const hasValidClient = Boolean(clientId && !PLACEHOLDER_VALUES.has(clientId));
  const hasValidDomain = Boolean(domain && !PLACEHOLDER_VALUES.has(domain));

  const isConfigured = enabledFlag && hasValidPool && hasValidClient && hasValidDomain;

  return {
    enabled: enabledFlag,
    userPoolId,
    clientId,
    domain,
    redirectUri,
    logoutUri,
    scopes,
    isConfigured,
  };
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateRandomUrlSafeString(byteLength = 32): string {
  const array = new Uint8Array(byteLength);
  window.crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generatePkceChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Initiates the OAuth 2.0 Authorization Code + PKCE redirect to Amazon Cognito Hosted UI
 * federated with Google (`identity_provider=Google`).
 */
export async function startGoogleCognitoSignIn(returnTo = '/'): Promise<void> {
  const config = getCognitoConfig();
  if (!config.isConfigured) {
    throw new Error('Вхід через Google (Amazon Cognito) ще не налаштовано в поточному середовищі.');
  }

  const codeVerifier = generateRandomUrlSafeString(48);
  const codeChallenge = await generatePkceChallenge(codeVerifier);
  const state = generateRandomUrlSafeString(24);

  // Keep the one-time OAuth data in localStorage so the callback can read it
  // even when the provider returns in a fresh tab/window on the same origin.
  localStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  localStorage.setItem(OAUTH_STATE_KEY, state);
  localStorage.setItem(POST_LOGIN_REDIRECT_KEY, returnTo);

  const authorizeUrl = new URL(`${config.domain}/oauth2/authorize`);
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', config.scopes);
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizeUrl.searchParams.set('identity_provider', 'Google');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);

  window.location.assign(authorizeUrl.toString());
}

export interface CognitoTokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

/**
 * Exchanges the authorization code returned to `/auth/callback` for Cognito tokens
 * at the Cognito Hosted UI `/oauth2/token` endpoint using the stored PKCE verifier.
 */
export async function exchangeCognitoCodeForTokens(
  code: string,
  returnedState: string | null
): Promise<{ tokens: CognitoTokenResponse; returnTo: string }> {
  const config = getCognitoConfig();
  if (!config.isConfigured) {
    throw new Error('Конфігурація Amazon Cognito відсутня або неповна.');
  }

  const expectedState = localStorage.getItem(OAUTH_STATE_KEY);
  const codeVerifier = localStorage.getItem(PKCE_VERIFIER_KEY);
  const returnTo = localStorage.getItem(POST_LOGIN_REDIRECT_KEY) || '/';

  // Clean up one-time PKCE & state values from sessionStorage
  localStorage.removeItem(OAUTH_STATE_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    throw new Error('Помилка перевірки безпеки OAuth (невірний параметр state). Спробуйте увійти ще раз.');
  }

  if (!codeVerifier) {
    throw new Error('Відсутній PKCE code_verifier у поточній сесії браузера. Спробуйте почати вхід заново.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    const errDesc =
      data?.error_description || data?.error || 'Не вдалося обміняти код авторизації на токен Cognito.';
    throw new Error(errDesc);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_PROVIDER_SESSION_KEY, 'cognito');
  }

  return {
    tokens: data as CognitoTokenResponse,
    returnTo,
  };
}

export function markLocalAuthSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_PROVIDER_SESSION_KEY, 'local');
  }
}

export function clearAuthProviderSession(): string | null {
  if (typeof window === 'undefined') return null;
  const provider = localStorage.getItem(AUTH_PROVIDER_SESSION_KEY);
  localStorage.removeItem(AUTH_PROVIDER_SESSION_KEY);
  return provider;
}

export function getCognitoLogoutUrl(): string | null {
  const config = getCognitoConfig();
  if (!config.isConfigured) return null;
  const logoutUrl = new URL(`${config.domain}/logout`);
  logoutUrl.searchParams.set('client_id', config.clientId);
  logoutUrl.searchParams.set('logout_uri', config.logoutUri);
  return logoutUrl.toString();
}
