import express from 'express';
import { handleFallThrough } from './controllers/fallthrough';
import { handleHelpCommand } from './controllers/help';
import { handlePuzzleCommand } from './controllers/puzzle';
import { handleAuthorize, handleSetTimeCommand } from './controllers/user';

const app = express();
const port = 3000;

app.use(express.json());

// app.get('/');

// app.get('/auth');

app.post('/api/v1/auth', handleAuthorize);

app.post('/api/v1/help', handleHelpCommand);

app.post('/api/v1/puzzle', handlePuzzleCommand);

app.post('/api/v1/set-time', handleSetTimeCommand);

app.all('*', handleFallThrough);

app.listen(port, () => {
  console.log(`Lichess Slack App listening at port ${port}...`);
});