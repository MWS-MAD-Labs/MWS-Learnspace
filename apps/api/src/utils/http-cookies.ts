import type { HttpRequest, HttpResponse } from '../type/http.js';

export const sessionCookieName = 'learnspace_session';
export const csrfCookieName = 'learnspace_csrf';
export const oauthContextCookieName = 'learnspace_oauth';

const csrfTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function isValidCsrfToken(value: string | undefined): value is string {
  return value !== undefined && csrfTokenPattern.test(value);
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseCookies(request: HttpRequest): Record<string, string> {
  const header = request.header('cookie');
  if (!header) return {};

  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator < 0) return [part, ''];
        return [
          part.slice(0, separator),
          decodeCookieValue(part.slice(separator + 1)),
        ];
      }),
  );
}

type CookieOptions = {
  httpOnly: boolean;
  maxAgeSeconds: number;
  sameSite: 'Lax' | 'Strict';
  secure: boolean;
};

function serializeCookie(name: string, value: string, options: CookieOptions) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${options.maxAgeSeconds}`,
    `SameSite=${options.sameSite}`,
  ];
  if (options.httpOnly) attributes.push('HttpOnly');
  if (options.secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function appendCookie(
  response: HttpResponse,
  name: string,
  value: string,
  options: CookieOptions,
) {
  const existing = response.getHeader('set-cookie');
  const cookie = serializeCookie(name, value, options);
  response.setHeader(
    'set-cookie',
    Array.isArray(existing)
      ? [...existing.map(String), cookie]
      : existing
        ? [String(existing), cookie]
        : [cookie],
  );
}

export function clearCookie(
  response: HttpResponse,
  name: string,
  secure: boolean,
) {
  appendCookie(response, name, '', {
    httpOnly: name !== csrfCookieName,
    maxAgeSeconds: 0,
    sameSite: name === oauthContextCookieName ? 'Lax' : 'Strict',
    secure,
  });
}
