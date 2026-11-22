import { API_VERSION } from '@veritas/schemas';
import { handler, json } from '@/server/http';

export const GET = handler(async () => json({ status: 'ok', version: API_VERSION }));
