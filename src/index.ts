
import { Hono } from 'hono';
import v1 from './routes';

const app = new Hono();

app.route('/api/v1', v1);

app.notFound((c) => c.text('404', 404));

app.onError((error, c) => c.text(`${error}`, 500));

export default app;
