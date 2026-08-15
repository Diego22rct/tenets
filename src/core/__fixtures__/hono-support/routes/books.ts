import { Hono } from 'hono';

const app = new Hono()
  .get('/', (c: any) => c.json([{ id: 1, title: 'Clean Architecture' }]))
  .post('/', (c: any) => c.json({ created: true }, 201))
  .get('/:id', (c: any) => c.json({ id: c.req.param('id') }));

export default app;
export type BooksAppType = typeof app;
