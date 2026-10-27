/**
 * Google OAuth 2.0 server-side ("web server") flow.
 * Endpoints from https://accounts.google.com/.well-known/openid-configuration (read 2026-10-18).
 * Flow: https://developers.google.com/identity/protocols/oauth2/web-server
 * [UNVERIFIED against Google until an OAuth client exists.]
 */
export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export interface GoogleOAuthClient {
  authUrl(state: string): string;
  /** Exchange the callback code for the user's profile. Throws on any failure. */
  exchange(code: string): Promise<GoogleProfile>;
}

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

export class HttpGoogleOAuthClient implements GoogleOAuthClient {
  constructor(
    private readonly cfg: { clientId: string; clientSecret: string; redirectUri: string },
  ) {}

  authUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      redirect_uri: this.cfg.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `${AUTH_ENDPOINT}?${params}`;
  }

  async exchange(code: string): Promise<GoogleProfile> {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        redirect_uri: this.cfg.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw new Error(`Google token endpoint responded ${tokenRes.status}`);
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) throw new Error('Google token response had no access_token');

    // Profile straight from Google over HTTPS, so no ID-token signature check is needed here.
    const infoRes = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) throw new Error(`Google userinfo responded ${infoRes.status}`);
    const info = (await infoRes.json()) as Record<string, unknown>;
    if (typeof info.sub !== 'string' || typeof info.email !== 'string') {
      throw new Error('Google userinfo lacked sub or email');
    }
    return {
      sub: info.sub,
      email: info.email.toLowerCase(),
      emailVerified: info.email_verified === true,
      name: typeof info.name === 'string' ? info.name : null,
      picture: typeof info.picture === 'string' ? info.picture : null,
    };
  }
}
