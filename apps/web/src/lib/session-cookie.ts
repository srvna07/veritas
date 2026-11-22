export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const SESSION_COOKIE = IS_PRODUCTION ? '__Host-veritas_session' : 'veritas_session';
