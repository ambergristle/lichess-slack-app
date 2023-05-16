import express from 'express';
import { handleAuthorize } from 'controllers/auth/index.js';
import {
  handleGetHelp,
  handleNotFound,
  handleGetPuzzle,
  handleSetPuzzleTime,
} from 'controllers/commands/index.js';

const app = express();
const port = 8080;

app.use(express.json());

// #region Routes

app.post('/api/v1/auth', handleAuthorize);

app.post('/api/v1/help', handleGetHelp);

app.post('/api/v1/puzzle', handleGetPuzzle);

app.post('/api/v1/set-time', handleSetPuzzleTime);

app.all('*', handleNotFound);

// #endregion

app.listen(port, () => {
  console.log(`Lichess Slack App listening at port ${port}...`);
});
