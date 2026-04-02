import { defineConfig, loadEnv } from 'vite';
import { handleLeadRequest } from './lib/pipedriveLead.js';

function mergeEnvIntoProcess(env) {
  for (const key of Object.keys(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = env[key];
    }
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      {
        name: 'local-api-lead',
        configureServer(server) {
          const env = loadEnv(mode, process.cwd(), '');
          mergeEnvIntoProcess(env);

          server.middlewares.use(async (req, res, next) => {
            const pathname = req.url?.split('?')[0];
            if (pathname !== '/api/lead') {
              next();
              return;
            }

            mergeEnvIntoProcess(loadEnv(mode, process.cwd(), ''));

            if (req.method === 'OPTIONS') {
              const r = await handleLeadRequest({
                httpMethod: 'OPTIONS',
                body: '',
              });
              res.statusCode = r.statusCode;
              for (const [k, v] of Object.entries(r.headers)) {
                res.setHeader(k, v);
              }
              res.end(r.body);
              return;
            }

            if (req.method !== 'POST') {
              const r = await handleLeadRequest({
                httpMethod: req.method || 'GET',
                body: '',
              });
              res.statusCode = r.statusCode;
              for (const [k, v] of Object.entries(r.headers)) {
                res.setHeader(k, v);
              }
              res.end(r.body);
              return;
            }

            try {
              const body = await readRequestBody(req);
              const r = await handleLeadRequest({
                httpMethod: 'POST',
                body,
              });
              res.statusCode = r.statusCode;
              for (const [k, v] of Object.entries(r.headers)) {
                res.setHeader(k, v);
              }
              res.end(r.body);
            } catch (err) {
              console.error('[api/lead]', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'Falha ao processar a requisição no servidor de desenvolvimento.',
                })
              );
            }
          });
        },
      },
    ],
  };
});
