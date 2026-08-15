import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c: any, next: any) => {
  const token = c.req.header('Authorization');
  if (!token) {
    return c.text('Unauthorized', 401);
  }
  await next();
});
