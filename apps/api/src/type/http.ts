import type { MembershipScope } from '../utils/authorization.js';
import { Hono, type Context, type MiddlewareHandler } from 'hono';

export type HttpLocals = {
  requestId?: string;
  session?: any;
  [key: string]: unknown;
};

export type HttpRequest = {
  auth?: {
    sessionId: string;
    userId: string;
    membershipId?: string;
    memberships: MembershipScope[];
  };
  readonly body: unknown;
  readonly method: string;
  readonly originalUrl: string;
  readonly params: Record<string, string>;
  readonly query: Record<string, string | string[]>;
  readonly res: HttpResponse;
  get(name: string): string | undefined;
  header(name: string): string | undefined;
};

export type AuthenticatedRequest = HttpRequest;

export type HttpResponse = {
  readonly locals: HttpLocals;
  readonly statusCode: number;
  end(): HttpResponse;
  getHeader(name: string): string | string[] | undefined;
  json(body: unknown): HttpResponse;
  redirect(status: number, url: string): HttpResponse;
  send(body?: unknown): HttpResponse;
  setHeader(
    name: string,
    value: string | number | readonly string[],
  ): HttpResponse;
  status(status: number): HttpResponse;
};

export type NextFunction = (error?: unknown) => Promise<void>;
export type RequestHandler = (
  request: HttpRequest,
  response: HttpResponse,
  next: NextFunction,
) => void | Promise<void>;

export type ErrorRequestHandler = (
  error: unknown,
  request: HttpRequest,
  response: HttpResponse,
  next: NextFunction,
) => void | Promise<void>;

type AdapterState = {
  request: HttpRequest;
  response: HttpResponse;
};

const states = new WeakMap<Context, AdapterState>();
const requestBodies = new WeakMap<Context, unknown>();

function queryRecord(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams) {
    const current = query[key];
    query[key] =
      current === undefined
        ? value
        : Array.isArray(current)
          ? [...current, value]
          : [current, value];
  }
  return query;
}

function createAdapterState(context: Context): AdapterState {
  const locals: HttpLocals = {};
  const headers = new Map<string, string | string[]>();
  let status = 200;
  let finalized: Response | undefined;

  const finalize = (body?: BodyInit | null) => {
    const output = new Headers();
    for (const [name, value] of headers) {
      if (Array.isArray(value)) {
        for (const item of value) output.append(name, item);
      } else {
        output.set(name, value);
      }
    }
    finalized = new Response(body, { status, headers: output });
    context.res = finalized;
  };

  const response: HttpResponse = {
    locals,
    get statusCode() {
      return finalized?.status ?? context.res.status ?? status;
    },
    end() {
      finalize(null);
      return response;
    },
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
    json(body) {
      headers.set('content-type', 'application/json; charset=UTF-8');
      finalize(JSON.stringify(body));
      return response;
    },
    redirect(nextStatus, url) {
      status = nextStatus;
      headers.set('location', url);
      finalize(null);
      return response;
    },
    send(body) {
      if (body === undefined || body === null) finalize(null);
      else if (typeof body === 'string') finalize(body);
      else if (body instanceof Uint8Array) finalize(Uint8Array.from(body));
      else {
        return response.json(body);
      }
      return response;
    },
    setHeader(name, value) {
      const normalizedName = name.toLowerCase();
      const normalizedValue = Array.isArray(value)
        ? value.map(String)
        : String(value);
      headers.set(normalizedName, normalizedValue);
      context.header(
        normalizedName,
        Array.isArray(normalizedValue)
          ? normalizedValue.join(', ')
          : normalizedValue,
      );
      return response;
    },
    status(nextStatus) {
      status = nextStatus;
      return response;
    },
  };

  const url = new URL(context.req.url);
  const request: HttpRequest = {
    get body() {
      return requestBodies.get(context);
    },
    method: context.req.method,
    originalUrl: `${url.pathname}${url.search}`,
    get params() {
      return context.req.param();
    },
    query: queryRecord(url),
    res: response,
    get: (name) => context.req.header(name),
    header: (name) => context.req.header(name),
  };
  return { request, response };
}

export function httpAdapters(context: Context): AdapterState {
  const existing = states.get(context);
  if (existing) return existing;
  const created = createAdapterState(context);
  states.set(context, created);
  return created;
}

export function setRequestBody(context: Context, body: unknown): void {
  requestBodies.set(context, body);
}

export function adaptHandler(handler: RequestHandler): MiddlewareHandler {
  return async (context, next) => {
    const { request, response } = httpAdapters(context);
    let nextPromise: Promise<void> | undefined;
    let nextError: unknown;
    const compatibilityNext: NextFunction = (error) => {
      if (error !== undefined) {
        nextError = error;
        return Promise.resolve();
      }
      nextPromise ??= next();
      return nextPromise;
    };
    await handler(request, response, compatibilityNext);
    if (nextError !== undefined) throw nextError;
    await nextPromise;
  };
}

export type Router = HonoRouter;

export class HonoRouter {
  readonly app = new Hono();

  delete(path: string, ...handlers: RequestHandler[]): this {
    (this.app.delete as (...arguments_: unknown[]) => unknown)(
      path,
      ...handlers.map(adaptHandler),
    );
    return this;
  }

  get(path: string, ...handlers: RequestHandler[]): this {
    (this.app.get as (...arguments_: unknown[]) => unknown)(
      path,
      ...handlers.map(adaptHandler),
    );
    return this;
  }

  patch(path: string, ...handlers: RequestHandler[]): this {
    (this.app.patch as (...arguments_: unknown[]) => unknown)(
      path,
      ...handlers.map(adaptHandler),
    );
    return this;
  }

  post(path: string, ...handlers: RequestHandler[]): this {
    (this.app.post as (...arguments_: unknown[]) => unknown)(
      path,
      ...handlers.map(adaptHandler),
    );
    return this;
  }

  put(path: string, ...handlers: RequestHandler[]): this {
    (this.app.put as (...arguments_: unknown[]) => unknown)(
      path,
      ...handlers.map(adaptHandler),
    );
    return this;
  }

  use(handler: RequestHandler): this;
  use(router: Router): this;
  use(path: string, router: Router): this;
  use(first: string | RequestHandler | Router, second?: Router): this {
    if (typeof first === 'string') {
      this.app.route(first, second!.app);
    } else if (first instanceof HonoRouter) {
      this.app.route('/', first.app);
    } else {
      this.app.use('*', adaptHandler(first));
    }
    return this;
  }
}

export function createRouter(): Router {
  return new HonoRouter();
}

export function mountRouter(app: Hono, path: string, router: Router): void {
  app.route(path, router.app);
}
