import type { Request, Response } from 'express';

export const sessionCookieName = 'learnspace_session';
export const csrfCookieName = 'learnspace_csrf';
export const oauthContextCookieName = 'learnspace_oauth';

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseCookies(request: Request): Record<string, string> {
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
  response: Response,
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

export function clearCookie(response: Response, name: string, secure: boolean) {
  appendCookie(response, name, '', {
    httpOnly: name !== csrfCookieName,
    maxAgeSeconds: 0,
    sameSite: name === oauthContextCookieName ? 'Lax' : 'Strict',
    secure,
  });
}
