import express, { NextFunction, Request, Response } from 'express';
import { getContacts } from './services/rmit-contacts';
import { logger } from './utils/logger';
import { initializeDatabase } from './services/contacts-db';

const app = express();
const port = 3000;

async function startServer() {
  const db = await initializeDatabase();

  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  app.get('/universities/rmit/academic-contacts', async (_req: Request, res: Response) => {
    const contacts = await getContacts(db);
    res.json(contacts);
  });

  // Global Error Handling Middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(`Error: ${err.message}`);
    res.status(500).send('An unexpected error occurred');
  });

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

// Handle errors during initialization
startServer().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1); // Exit with a failure code
});
