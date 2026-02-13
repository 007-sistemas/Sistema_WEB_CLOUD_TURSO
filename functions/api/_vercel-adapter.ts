type VercelLikeHandler = (req: any, res: any) => Promise<any> | any;

type EnvVars = Record<string, string | undefined>;

type ResponseState = {
  status: number;
  headers: Headers;
  body?: string;
  ended: boolean;
};

export function applyEnv(env: EnvVars) {
  const globalAny = globalThis as any;
  if (!globalAny.process) {
    globalAny.process = { env: {} };
  }
  const current = globalAny.process.env || {};
  globalAny.process.env = { ...current, ...env };
}

async function parseBody(request: Request): Promise<any> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildQuery(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    const current = query[key];
    if (!current) {
      query[key] = value;
      return;
    }
    if (Array.isArray(current)) {
      current.push(value);
      return;
    }
    query[key] = [current, value];
  });
  return query;
}

export async function handleVercelFunction(
  request: Request,
  env: EnvVars,
  handler: VercelLikeHandler
): Promise<Response> {
  applyEnv(env);

  const url = new URL(request.url);
  const body = await parseBody(request);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const req = {
    method: request.method.toUpperCase(),
    query: buildQuery(url),
    body,
    headers,
  };

  const state: ResponseState = {
    status: 200,
    headers: new Headers(),
    body: undefined,
    ended: false,
  };

  const res = {
    setHeader: (name: string, value: string) => {
      state.headers.set(name, value);
    },
    status: (code: number) => {
      state.status = code;
      return res;
    },
    json: (data: any) => {
      state.headers.set('Content-Type', 'application/json');
      state.body = JSON.stringify(data);
      state.ended = true;
      return res;
    },
    end: (data?: any) => {
      if (data !== undefined) {
        state.body = typeof data === 'string' ? data : JSON.stringify(data);
      }
      state.ended = true;
      return res;
    },
  };

  await handler(req, res);

  if (state.status === 204) {
    return new Response(null, { status: state.status, headers: state.headers });
  }

  return new Response(state.body ?? '', {
    status: state.status,
    headers: state.headers,
  });
}
