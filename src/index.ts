
import { Hono } from 'hono';
import slack from './routes';

const app = new Hono();

app.route('/slack', slack);

app.notFound((c) => c.text('404', 404));

app.onError((error, c) => c.text(`${error}`, 500));

export default app;
