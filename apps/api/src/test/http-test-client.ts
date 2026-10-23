import { getRequestListener } from '@hono/node-server';
import type { Hono } from 'hono';
import request from 'supertest';
import type { Router } from '../type/http.js';

export function httpTestClient(app: Hono | Router) {
  const hono = 'app' in app ? app.app : app;
  return getRequestListener(hono.fetch);
}

export default function httpRequest(app: Hono | Router) {
  return request(httpTestClient(app));
}
