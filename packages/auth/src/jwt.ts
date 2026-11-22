import { SignJWT, jwtVerify } from 'jose';
import { roleSchema, type Role } from '@veritas/schemas';

const ISSUER = 'veritas';
const AUDIENCE = 'veritas-web';

export type SessionClaims = {
  userId: string;
  sessionId: string;
  role: Role;
};

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  claims: SessionClaims,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  return new SignJWT({ role: claims.role, sid: claims.sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(encodeSecret(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    const role = roleSchema.safeParse(payload.role);
    if (!role.success || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      return null;
    }
    return { userId: payload.sub, sessionId: payload.sid, role: role.data };
  } catch {
    return null;
  }
}
