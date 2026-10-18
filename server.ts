/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

/**
 * -------------------------------------------------------------
 * GitHub OAuth Authentication Endpoints
 * -------------------------------------------------------------
 */

// Return OAuth Authorization URL for direct popup launch
app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || '';
  const appUrl = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
  const redirectUri = `${appUrl}/auth/callback`;

  if (!clientId) {
    return res.status(200).json({
      configured: false,
      message: 'GitHub CLIENT_ID not configured in environment variables. You can enter a Personal Access Token (PAT) directly in the UI.',
      url: `https://github.com/login/oauth/authorize?client_id=PLACEHOLDER&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user,read:org`,
      redirectUri,
    });
  }

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=repo,user,read:org`;

  res.json({
    configured: true,
    url: authUrl,
    redirectUri,
  });
});

// OAuth Callback handler with window.opener.postMessage
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <body style="background: #121316; color: #ff8585; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(error)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication canceled or failed. You may close this window.</p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <body style="background: #121316; color: #e2e2e6; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
          <script>window.close();</script>
          <p>No authorization code received.</p>
        </body>
      </html>
    `);
  }

  const clientId = process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET;

  let accessToken = '';
  let authError = '';

  try {
    if (clientId && clientSecret) {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const data = await response.json();
      if (data.access_token) {
        accessToken = data.access_token;
      } else {
        authError = data.error_description || data.error || 'Token exchange failed';
      }
    } else {
      authError = 'GITHUB_CLIENT_SECRET not configured on server';
    }
  } catch (err: any) {
    authError = err.message || 'Network error during token exchange';
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Connecting to GitHub...</title>
      </head>
      <body style="background: #121316; color: #e2e2e6; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="background: #1e1f22; border: 1px solid #43474e; border-radius: 16px; padding: 2rem; max-width: 400px; text-align: center;">
          <h2 style="color: #a8c7fa; margin-top: 0;">GitHub Authentication</h2>
          <p>${authError ? `<span style="color: #ff8585;">${authError}</span>` : 'Successfully authenticated! Returning to ZipStudio...'}</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: ${authError ? "'OAUTH_AUTH_ERROR'" : "'OAUTH_AUTH_SUCCESS'"},
              token: ${JSON.stringify(accessToken)},
              error: ${JSON.stringify(authError)}
            }, '*');
            setTimeout(() => { window.close(); }, 800);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `);
});

/**
 * -------------------------------------------------------------
 * Vite Middleware & Static Frontend Serving
 * -------------------------------------------------------------
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`ZipStudio Server running at http://localhost:${PORT}`);
  });
}

startServer();
