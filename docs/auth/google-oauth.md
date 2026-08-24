# Google OAuth configuration

Learnspace uses Google OpenID Connect authorization code flow with state, nonce, and PKCE. The API exchanges the authorization code, verifies the signed ID token, applies the admission policy, and creates an opaque server-side session. OAuth client secrets and session secrets must never be committed to source control or exposed to the web build.

## Required API configuration

| Variable                 | Purpose                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `APP_URL`                | Public browser origin of the Learnspace web application.                                           |
| `GOOGLE_CLIENT_ID`       | OAuth 2.0 web client ID for the current environment.                                               |
| `GOOGLE_CLIENT_SECRET`   | OAuth 2.0 web client secret for the current environment.                                           |
| `GOOGLE_REDIRECT_URI`    | Exact public API callback URL registered in Google Cloud.                                          |
| `SESSION_SECRET`         | At least 32 random characters used for keyed token hashes and encrypted short-lived OAuth context. |
| `AUTH_ADMISSION_MODE`    | `DENY_UNKNOWN`, `INVITE_ONLY`, or `ALLOWED_DOMAIN`. Defaults to `DENY_UNKNOWN`.                    |
| `GOOGLE_ALLOWED_DOMAINS` | Comma-separated lowercase domains. Used only in `ALLOWED_DOMAIN` mode and never grants a role.     |
| `SESSION_TTL_HOURS`      | Session lifetime from 1 to 168 hours.                                                              |

Generate `SESSION_SECRET` with a cryptographically secure secret manager or password generator. Do not reuse the Google client secret as the session secret.

## Google Cloud setup

Create a separate Google Cloud project or OAuth client for each environment. Configure the OAuth consent screen with only `openid`, `email`, and `profile`. Create an **OAuth 2.0 Client ID** with application type **Web application**.

Register the values below exactly. Google compares scheme, hostname, port, path, and trailing slash.

| Environment | Authorized JavaScript origin         | Authorized redirect URI                                   |
| ----------- | ------------------------------------ | --------------------------------------------------------- |
| Development | `http://localhost:3000`              | `http://localhost:3000/api/v1/auth/callback`              |
| Staging     | `https://staging.learnspace.example` | `https://staging.learnspace.example/api/v1/auth/callback` |
| Production  | `https://learnspace.example`         | `https://learnspace.example/api/v1/auth/callback`         |

Replace the example staging and production hostnames with the deployed hosts. `GOOGLE_REDIRECT_URI` must equal the matching registered redirect URI. `APP_URL` must equal the web origin used after callback.

The browser starts login at `/api/v1/auth/login`; this route is not a Google callback and must not be registered as one.

## Admission modes

- `DENY_UNKNOWN`: only users already present in PostgreSQL can link a Google identity. This is the safest default.
- `INVITE_ONLY`: existing users and users with an unexpired `UserInvitation` can sign in. The invitation assigns the organization and role; the email domain does not.
- `ALLOWED_DOMAIN`: existing users, invited users, and verified addresses in `GOOGLE_ALLOWED_DOMAINS` can create an identity record. Domain-admitted users intentionally receive no organization membership or role and see Access Denied until an operator provisions their membership. Domain ownership alone never grants application access.

Disabled users are denied even when their Google identity and domain are valid.

## Development

Use a dedicated non-production OAuth client. Place secrets in an untracked local environment file or secret-injection mechanism. The documented `development-placeholder` values are accepted only when all of the following are true:

- `NODE_ENV=development`
- `ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS=true`
- no real Google login is expected

A real login requires real development credentials and `ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS=false`.

The Vite development server proxies `/api` to `http://localhost:4000`, matching the production Nginx same-origin proxy. Keep `VITE_API_BASE_URL` unset for the standard deployment so the callback and session cookies remain on the web origin.

## Staging and production

- Store `GOOGLE_CLIENT_SECRET` and `SESSION_SECRET` in the deployment platform's secret store.
- Restrict secret read access to the API workload and deployment operators.
- Use HTTPS end to end. Production session, CSRF, and OAuth cookies are `Secure`, use `Path=/`, and do not set a `Domain` attribute.
- Do not expose secrets through Vite variables, container image layers, logs, support bundles, or CI output.
- Keep staging and production Google clients separate so callback URLs and secret rotation cannot affect the other environment.
- Start with `DENY_UNKNOWN` or `INVITE_ONLY`; use domain admission only after documenting the provisioning workflow.

## Secret rotation

### Google client secret

1. Create a new secret for the environment's existing OAuth client, or create a replacement client if Google does not support overlapping secrets for the operational requirement.
2. Update `GOOGLE_CLIENT_SECRET` in the environment secret store.
3. Redeploy the API and complete a login smoke test.
4. Revoke the old secret/client only after the new deployment is healthy.

Changing the Google client ID also requires updating `GOOGLE_CLIENT_ID`, the registered redirect URI, and any Google consent-screen test-user configuration.

### Session secret

Changing `SESSION_SECRET` invalidates lookup of every existing session and every in-progress OAuth transaction. Rotate it during a maintenance window:

1. Notify users that they will be signed out.
2. update the secret store with a newly generated value;
3. redeploy all API instances together;
4. verify a fresh login and logout;
5. remove the previous value from the secret store.

Learnspace stores only keyed hashes of session tokens, so old raw tokens cannot be recovered or migrated.

## Verification checklist

- Google redirects only to the exact API callback for the environment.
- The callback rejects modified state, reused state, wrong audience, wrong nonce, expired tokens, and unverified email addresses.
- `Session.tokenHash` and `OAuthLoginTransaction` hashes contain no raw browser token.
- A production session cookie includes `HttpOnly; Secure; SameSite=Strict; Path=/`.
- Logout revokes the database session and clears both session and CSRF cookies.
- Unknown and disabled accounts receive a safe denial page without application data rendering.
