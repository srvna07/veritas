import { vi } from 'vitest';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function lastRequest(fetchMock: ReturnType<typeof mockFetch>) {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) {
    throw new Error('fetch was not called');
  }
  const [url, init] = call;
  return {
    url: String(url),
    method: init?.method,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
}
