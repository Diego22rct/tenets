import { Hono } from 'hono';
import { createFactory } from 'hono/factory';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';

const factory = createFactory();

export const usersHandlers = factory.createHandlers((c: any) => {
  return c.json({ users: [] });
});

export const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  responses: { 200: { description: 'User retrieved' } },
});

export const usersApp = new OpenAPIHono();
usersApp.openapi(getUserRoute, (c: any) => c.json({ id: '123' }));
