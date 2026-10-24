/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RemoteCursor {
  peerId: string;
  name: string;
  color: string;
  filePath: string;
  line: number;
  col: number;
  x?: number;
  y?: number;
  selection?: {
    start: number;
    end: number;
  };
}

export interface CollabPeer {
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

export interface FileUpdateEvent {
  filePath: string;
  version: number;
  content: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  timestamp: number;
  isConflictResolved?: boolean;
  conflictNote?: string;
}

export interface ConflictRecord {
  id: string;
  filePath: string;
  message: string;
  senderName: string;
  timestamp: number;
}

const COLLAB_COLORS = [
  '#a8c7fa', // M3 Blue
  '#3ddc84', // Android Green
  '#ffb4ab', // Coral Rose
  '#ffd54f', // Amber Gold
  '#d0bcff', // Soft Purple
  '#80cbc4', // Teal Cyan
  '#ff80ab', // Vibrant Pink
  '#82b1ff', // Sky Blue
];

export function getRandomCollabColor(): string {
  return COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
}

export function getStoredCollabProfile(): { id: string; name: string; color: string } {
  try {
    const raw = localStorage.getItem('zipstudio_collab_profile');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  const id = 'user_' + Math.random().toString(36).substring(2, 9);
  const color = getRandomCollabColor();
  const randomNum = Math.floor(100 + Math.random() * 900);
  const profile = { id, name: `Developer #${randomNum}`, color };
  try {
    localStorage.setItem('zipstudio_collab_profile', JSON.stringify(profile));
  } catch {}
  return profile;
}

export function saveStoredCollabProfile(profile: { id: string; name: string; color: string }) {
  try {
    localStorage.setItem('zipstudio_collab_profile', JSON.stringify(profile));
  } catch {}
}

/**
 * Singleton Client Collaboration Service managing WebSocket connection,
 * presence tracking, high-frequency throttled cursor dispatch, and conflict convergence.
 */
class CollabService {
  private ws: WebSocket | null = null;
  private roomId: string = 'default-workspace';
  private peerProfile = getStoredCollabProfile();
  private isConnected = false;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private lastPingSent = 0;
  private latencyMs = 0;

  private peers: Map<string, CollabPeer> = new Map();
  private fileVersions: Map<string, number> = new Map();
  private conflicts: ConflictRecord[] = [];

  // Listeners
  private peerListeners: Set<(peers: CollabPeer[]) => void> = new Set();
  private cursorListeners: Set<(cursors: RemoteCursor[]) => void> = new Set();
  private fileUpdateListeners: Set<(event: FileUpdateEvent) => void> = new Set();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private conflictListeners: Set<(conflicts: ConflictRecord[]) => void> = new Set();

  private cursorThrottleTimer: any = null;
  private pendingCursor: { filePath: string; line: number; col: number; x?: number; y?: number; selection?: { start: number; end: number } } | null = null;

  constructor() {
    // Check if room is defined in URL parameters (?room=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r) {
        this.roomId = r;
      }
    }
  }

  public connect(roomId = this.roomId) {
    if (typeof window === 'undefined') return;
    this.roomId = roomId;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/collab`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyConnection();
        this.joinRoom();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyConnection();
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.notifyConnection();
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyConnection();
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public setRoomId(newRoomId: string) {
    if (!newRoomId || newRoomId === this.roomId) return;
    this.roomId = newRoomId;
    this.peers.clear();
    this.notifyPeers();
    this.notifyCursors();

    // Update URL quietly without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', newRoomId);
      window.history.replaceState({}, '', url.toString());
    }

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.joinRoom();
    } else {
      this.connect(newRoomId);
    }
  }

  public getProfile(): { id: string; name: string; color: string } {
    return this.peerProfile;
  }

  public updateProfile(name: string, color: string) {
    this.peerProfile.name = name;
    this.peerProfile.color = color;
    saveStoredCollabProfile(this.peerProfile);
    if (this.isConnected) {
      this.joinRoom();
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public getPeers(): CollabPeer[] {
    return Array.from(this.peers.values());
  }

  public getConflicts(): ConflictRecord[] {
    return this.conflicts;
  }

  public sendCursorMove(
    filePath: string,
    line: number,
    col: number,
    x?: number,
    y?: number,
    selection?: { start: number; end: number }
  ) {
    this.pendingCursor = { filePath, line, col, x, y, selection };

    if (!this.cursorThrottleTimer) {
      this.cursorThrottleTimer = setTimeout(() => {
        this.cursorThrottleTimer = null;
        if (this.pendingCursor && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'cursor:move',
              ...this.pendingCursor,
            })
          );
        }
      }, 35); // 35ms throttling (~30 updates/sec for smooth non-laggy cursor motion)
    }
  }

  public sendFileEdit(filePath: string, newContent: string, baseContent?: string) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const currentVer = this.fileVersions.get(filePath) || 0;
    const nextVer = currentVer + 1;
    this.fileVersions.set(filePath, nextVer);

    this.ws.send(
      JSON.stringify({
        type: 'file:edit',
        filePath,
        version: nextVer,
        content: newContent,
        baseContent,
      })
    );
  }

  public onPeers(listener: (peers: CollabPeer[]) => void): () => void {
    this.peerListeners.add(listener);
    listener(Array.from(this.peers.values()));
    return () => this.peerListeners.delete(listener);
  }

  public onCursors(listener: (cursors: RemoteCursor[]) => void): () => void {
    this.cursorListeners.add(listener);
    return () => this.cursorListeners.delete(listener);
  }

  public onFileUpdate(listener: (event: FileUpdateEvent) => void): () => void {
    this.fileUpdateListeners.add(listener);
    return () => this.fileUpdateListeners.delete(listener);
  }

  public onConnection(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.add(listener);
    listener(this.isConnected);
    return () => this.connectionListeners.delete(listener);
  }

  public onConflicts(listener: (conflicts: ConflictRecord[]) => void): () => void {
    this.conflictListeners.add(listener);
    listener(this.conflicts);
    return () => this.conflictListeners.delete(listener);
  }

  // Private Handlers
  private joinRoom() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'collab:join',
        roomId: this.roomId,
        peer: {
          id: this.peerProfile.id,
          name: this.peerProfile.name,
          color: this.peerProfile.color,
        },
      })
    );
  }

  private handleMessage(dataStr: string) {
    try {
      const msg = JSON.parse(dataStr);

      switch (msg.type) {
        case 'collab:init': {
          this.peers.clear();
          if (Array.isArray(msg.peers)) {
            for (const p of msg.peers) {
              this.peers.set(p.id, p);
            }
          }
          if (msg.files) {
            for (const [path, f] of Object.entries<any>(msg.files)) {
              this.fileVersions.set(path, f.version);
            }
          }
          this.notifyPeers();
          this.notifyCursors();
          break;
        }

        case 'peer:joined': {
          if (msg.peer && msg.peer.id !== this.peerProfile.id) {
            this.peers.set(msg.peer.id, msg.peer);
            this.notifyPeers();
          }
          break;
        }

        case 'peer:left': {
          if (msg.peerId) {
            this.peers.delete(msg.peerId);
            this.notifyPeers();
            this.notifyCursors();
          }
          break;
        }

        case 'cursor:moved': {
          const peer = this.peers.get(msg.peerId);
          if (peer) {
            peer.activeFilePath = msg.filePath;
            peer.cursor = {
              line: msg.line,
              col: msg.col,
              x: msg.x,
              y: msg.y,
            };
            peer.selection = msg.selection;
            peer.lastSeen = Date.now();
            this.notifyCursors();
          }
          break;
        }

        case 'file:updated': {
          this.fileVersions.set(msg.filePath, msg.version);
          const updateEvt: FileUpdateEvent = {
            filePath: msg.filePath,
            version: msg.version,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderColor: msg.senderColor,
            timestamp: msg.timestamp,
            isConflictResolved: false,
          };

          for (const l of this.fileUpdateListeners) {
            l(updateEvt);
          }
          break;
        }

        case 'file:conflict_resolved': {
          this.fileVersions.set(msg.filePath, msg.version);
          const conflictRecord: ConflictRecord = {
            id: Math.random().toString(),
            filePath: msg.filePath,
            message: msg.conflictNote || 'Simultaneous edits reconciled by server',
            senderName: msg.senderName,
            timestamp: Date.now(),
          };
          this.conflicts = [conflictRecord, ...this.conflicts].slice(0, 30);
          this.notifyConflicts();

          const updateEvt: FileUpdateEvent = {
            filePath: msg.filePath,
            version: msg.version,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderColor: '#3ddc84',
            timestamp: msg.timestamp,
            isConflictResolved: true,
            conflictNote: msg.conflictNote,
          };

          for (const l of this.fileUpdateListeners) {
            l(updateEvt);
          }
          break;
        }

        case 'presence:pong': {
          if (msg.timestamp) {
            this.latencyMs = Math.max(1, Date.now() - msg.timestamp);
          }
          break;
        }
      }
    } catch (e) {
      console.warn('Error handling collab message:', e);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingSent = Date.now();
        this.ws.send(JSON.stringify({ type: 'presence:ping', timestamp: this.lastPingSent }));
      }
    }, 4000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.roomId);
    }, 2500);
  }

  private notifyPeers() {
    const list = Array.from(this.peers.values());
    for (const l of this.peerListeners) {
      l(list);
    }
  }

  private notifyCursors() {
    const cursors: RemoteCursor[] = [];
    for (const p of this.peers.values()) {
      if (p.cursor && p.activeFilePath) {
        cursors.push({
          peerId: p.id,
          name: p.name,
          color: p.color,
          filePath: p.activeFilePath,
          line: p.cursor.line,
          col: p.cursor.col,
          x: p.cursor.x,
          y: p.cursor.y,
          selection: p.selection,
        });
      }
    }
    for (const l of this.cursorListeners) {
      l(cursors);
    }
  }

  private notifyConnection() {
    for (const l of this.connectionListeners) {
      l(this.isConnected);
    }
  }

  private notifyConflicts() {
    for (const l of this.conflictListeners) {
      l(this.conflicts);
    }
  }
}

export const collabService = new CollabService();
