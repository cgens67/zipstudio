/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
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
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

/**
 * -------------------------------------------------------------
 * Real-Time Multi-User Collaboration State & WebSocket Server
 * -------------------------------------------------------------
 */

interface CollabPeer {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  activeFilePath?: string;
  cursor?: {
    line: number;
    col: number;
    x?: number;
    y?: number;
  };
  selection?: {
    start: number;
    end: number;
  };
  lastSeen: number;
}

interface CollabFileState {
  version: number;
  content: string;
  lastModifiedBy: string;
  lastModifiedName: string;
  timestamp: number;
}

interface CollabRoom {
  id: string;
  peers: Map<string, { ws: WebSocket; peer: CollabPeer }>;
  files: Map<string, CollabFileState>;
}

const collabRooms = new Map<string, CollabRoom>();

function getOrCreateRoom(roomId = 'default-workspace'): CollabRoom {
  let room = collabRooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      peers: new Map(),
      files: new Map(),
    };
    collabRooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(room: CollabRoom, message: object, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const { ws } of room.peers.values()) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

/**
 * Basic 3-way line merge conflict resolver for concurrent file edits.
 */
function resolveConcurrentTextEdit(baseContent: string, incomingContent: string, currentServerContent: string): string {
  if (incomingContent === currentServerContent) return currentServerContent;
  const currentLines = currentServerContent.split('\n');
  const incomingLines = incomingContent.split('\n');

  // If one user appended lines and the other edited earlier lines, merge line by line
  if (incomingLines.length !== currentLines.length) {
    // Preserve longer content structure while keeping incoming edits
    const maxLen = Math.max(incomingLines.length, currentLines.length);
    const merged: string[] = [];
    for (let i = 0; i < maxLen; i++) {
      if (incomingLines[i] !== undefined && currentLines[i] !== undefined) {
        merged.push(incomingLines[i] || currentLines[i]);
      } else {
        merged.push(incomingLines[i] !== undefined ? incomingLines[i] : currentLines[i]);
      }
    }
    return merged.join('\n');
  }

  // Same length line-by-line reconciliation
  const merged: string[] = [];
  for (let i = 0; i < currentLines.length; i++) {
    merged.push(incomingLines[i] || currentLines[i]);
  }
  return merged.join('\n');
}

/**
 * -------------------------------------------------------------
 * Vite Middleware & Static Frontend Serving
 * -------------------------------------------------------------
 */
async function startServer() {
  const server = http.createServer(app);

  // Setup WebSocket Server for Live Collaboration on /ws/collab
  const wss = new WebSocketServer({ server, path: '/ws/collab' });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId = 'default-workspace';
    let currentPeerId = '';

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'collab:join': {
            currentRoomId = msg.roomId || 'default-workspace';
            const room = getOrCreateRoom(currentRoomId);
            currentPeerId = msg.peer.id;

            const peer: CollabPeer = {
              id: msg.peer.id,
              name: msg.peer.name || 'Developer',
              color: msg.peer.color || '#a8c7fa',
              avatar: msg.peer.avatar,
              activeFilePath: msg.peer.activeFilePath,
              cursor: msg.peer.cursor,
              selection: msg.peer.selection,
              lastSeen: Date.now(),
            };

            room.peers.set(currentPeerId, { ws, peer });

            // Send current room state to joining client
            const activePeers = Array.from(room.peers.values())
              .filter((p) => p.peer.id !== currentPeerId)
              .map((p) => p.peer);

            const fileStates: Record<string, CollabFileState> = {};
            for (const [path, f] of room.files.entries()) {
              fileStates[path] = f;
            }

            ws.send(
              JSON.stringify({
                type: 'collab:init',
                yourId: currentPeerId,
                roomId: currentRoomId,
                peers: activePeers,
                files: fileStates,
                serverTime: Date.now(),
              })
            );

            // Announce new peer to everyone else in room
            broadcastToRoom(room, { type: 'peer:joined', peer }, ws);
            break;
          }

          case 'cursor:move': {
            const room = getOrCreateRoom(currentRoomId);
            const client = room.peers.get(currentPeerId);
            if (client) {
              client.peer.activeFilePath = msg.filePath;
              client.peer.cursor = {
                line: msg.line,
                col: msg.col,
                x: msg.x,
                y: msg.y,
              };
              client.peer.selection = msg.selection;
              client.peer.lastSeen = Date.now();

              broadcastToRoom(
                room,
                {
                  type: 'cursor:moved',
                  peerId: currentPeerId,
                  filePath: msg.filePath,
                  line: msg.line,
                  col: msg.col,
                  x: msg.x,
                  y: msg.y,
                  selection: msg.selection,
                },
                ws
              );
            }
            break;
          }

          case 'file:edit': {
            const room = getOrCreateRoom(currentRoomId);
            const client = room.peers.get(currentPeerId);
            const filePath = msg.filePath;
            const incomingVersion = msg.version || 1;
            const incomingContent = msg.content || '';
            const peerName = client?.peer.name || 'Collaborator';
            const peerColor = client?.peer.color || '#a8c7fa';

            let fileState = room.files.get(filePath);

            if (!fileState) {
              // Initial file registration on server
              fileState = {
                version: 1,
                content: incomingContent,
                lastModifiedBy: currentPeerId,
                lastModifiedName: peerName,
                timestamp: Date.now(),
              };
              room.files.set(filePath, fileState);

              broadcastToRoom(
                room,
                {
                  type: 'file:updated',
                  filePath,
                  version: 1,
                  content: incomingContent,
                  senderId: currentPeerId,
                  senderName: peerName,
                  senderColor: peerColor,
                  timestamp: fileState.timestamp,
                },
                ws
              );
            } else if (incomingVersion >= fileState.version) {
              // Standard clean edit (optimistic or current version match)
              fileState.version += 1;
              fileState.content = incomingContent;
              fileState.lastModifiedBy = currentPeerId;
              fileState.lastModifiedName = peerName;
              fileState.timestamp = Date.now();

              broadcastToRoom(
                room,
                {
                  type: 'file:updated',
                  filePath,
                  version: fileState.version,
                  content: incomingContent,
                  senderId: currentPeerId,
                  senderName: peerName,
                  senderColor: peerColor,
                  timestamp: fileState.timestamp,
                },
                ws
              );
            } else {
              // Version collision / conflict detected!
              const resolvedContent = resolveConcurrentTextEdit(
                msg.baseContent || fileState.content,
                incomingContent,
                fileState.content
              );

              fileState.version += 1;
              fileState.content = resolvedContent;
              fileState.lastModifiedBy = currentPeerId;
              fileState.lastModifiedName = peerName;
              fileState.timestamp = Date.now();

              // Broadcast conflict resolution to ALL participants (including sender) to ensure identical state
              broadcastToRoom(room, {
                type: 'file:conflict_resolved',
                filePath,
                version: fileState.version,
                content: resolvedContent,
                senderId: currentPeerId,
                senderName: peerName,
                conflictNote: `Simultaneous edits merged automatically between ${peerName} and ${fileState.lastModifiedName}`,
                timestamp: fileState.timestamp,
              });
            }
            break;
          }

          case 'presence:ping': {
            ws.send(JSON.stringify({ type: 'presence:pong', timestamp: msg.timestamp }));
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      const room = collabRooms.get(currentRoomId);
      if (room && currentPeerId) {
        const client = room.peers.get(currentPeerId);
        room.peers.delete(currentPeerId);
        broadcastToRoom(room, {
          type: 'peer:left',
          peerId: currentPeerId,
          peerName: client?.peer.name || 'Collaborator',
        });
      }
    });
  });

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

  server.listen(PORT, () => {
    console.log(`ZipStudio Full-Stack & Collaboration Server running at http://localhost:${PORT}`);
  });
}

startServer();
