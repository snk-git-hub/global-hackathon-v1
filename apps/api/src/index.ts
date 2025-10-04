import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from the API!');
});

app.get('/api/data', (req: Request, res: Response) => {
  res.json({ message: 'This is some data from the backend.' });
});

app.listen(port, () => {
  console.log(`[server]: API server is running at http://localhost:${port}`);
});