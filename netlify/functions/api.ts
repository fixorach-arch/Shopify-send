import serverless from 'serverless-http';
import { app } from '../../server/app.ts';

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Netlify rewrites /api/foo to /.netlify/functions/api/foo
  // We need to rewrite it back to /api/foo for Express to match the routes
  if (event.path && event.path.startsWith('/.netlify/functions/api')) {
    event.path = event.path.replace('/.netlify/functions/api', '/api');
  }
  
  return serverlessHandler(event, context);
};
