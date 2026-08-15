import { Hono } from 'hono';
import booksApp from './routes/books.js';
import { authMiddleware } from './middleware/auth.js';
import { usersApp } from './routes/users.js';
import { ItemService } from './services/item-service.js';

const app = new Hono();
const itemService = new ItemService();

app.use('*', authMiddleware);
app.route('/books', booksApp);
app.route('/users', usersApp);

app.get('/', (c: any) => c.text('Hono Home'));
app.get('/items/:id', (c: any) => c.json(itemService.findItem(c.req.param('id'))));

export default app;

