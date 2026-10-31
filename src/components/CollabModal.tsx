/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { M3Icon, M3Badge } from './M3Components';
import {
  collabService,
  CollabPeer,
  ConflictRecord,
  getRandomCollabColor,
} from '../utils/collabService';
import { Translations } from '../utils/i18n';
import { useDialogAnimation } from '../utils/useDialogAnimation';

interface CollabModalProps {
  isOpen: boolean;
  onClose: () => void;
  t?: Translations;
}

const PRESET_COLORS = [
  '#a8c7fa', // Blue
  '#3ddc84', // Green
  '#ffb4ab', // Coral
  '#ffd54f', // Amber
  '#d0bcff', // Purple
  '#80cbc4', // Teal
  '#ff80ab', // Pink
  '#82b1ff', // Sky Blue
];

export function CollabModal({ isOpen, onClose, t }: CollabModalProps) {
  const [profile, setProfile] = useState(() => collabService.getProfile());
  const [peers, setPeers] = useState<CollabPeer[]>(() => collabService.getPeers());
  const [conflicts, setConflicts] = useState<ConflictRecord[]>(() => collabService.getConflicts());
  const [isConnected, setIsConnected] = useState(() => collabService.getIsConnected());
  const [latency, setLatency] = useState(() => collabService.getLatency());
  const [roomIdInput, setRoomIdInput] = useState(() => collabService.getRoomId());
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'peers' | 'conflicts' | 'settings'>('peers');

  const { isRendered, triggerClose, backdropClass, dialogClass } = useDialogAnimation(isOpen, onClose, 220);

  useEffect(() => {
    if (!isOpen) return;

    const unsubPeers = collabService.onPeers(setPeers);
    const unsubConn = collabService.onConnection(setIsConnected);
    const unsubConflicts = collabService.onConflicts(setConflicts);

    const interval = setInterval(() => {
      setLatency(collabService.getLatency());
    }, 1000);

    return () => {
      unsubPeers();
      unsubConn();
      unsubConflicts();
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isRendered) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) return;
    collabService.updateProfile(profile.name.trim(), profile.color);
  };

  const handleSwitchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;
    collabService.setRoomId(roomIdInput.trim());
  };

  const handleCopyInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', collabService.getRoomId());
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 ${backdropClass}`}
      onClick={triggerClose}
    >
      <div
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${dialogClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-between bg-[#f8fafd] dark:bg-[#18191c]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00468b]/20 dark:bg-[#00468b]/40 border border-[#0b57d0]/30 dark:border-[#a8c7fa]/30 flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa]">
              <M3Icon name="group" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#191c20] dark:text-white">
                  {t?.liveCollaboration || 'Live Real-Time Collaboration'}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    isConnected
                      ? 'bg-[#e7f8ed] text-[#0f5223] dark:bg-[#0f5223] dark:text-[#b4f3b7] border border-[#308745]'
                      : 'bg-[#ffdad6] text-[#690005] dark:bg-[#690005] dark:text-[#ffdad6] border border-[#ba1a1a]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-[#3ddc84] animate-pulse' : 'bg-[#ff5449]'
                    }`}
                  />
                  {isConnected ? `Online (${latency}ms)` : 'Connecting...'}
                </span>
              </div>
              <p className="text-xs text-[#5d6168] dark:text-[#8e9199] mt-0.5">
                Room: <span className="font-mono text-[#0b57d0] dark:text-[#a8c7fa] font-medium">{collabService.getRoomId()}</span>
              </p>
            </div>
          </div>

          <button
            onClick={triggerClose}
            className="p-1 rounded-lg text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <M3Icon name="close" size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center px-5 border-b border-[#d8dae5] dark:border-[#43474e]/30 bg-[#f8fafd] dark:bg-[#1e1f22] text-xs">
          <button
            onClick={() => setActiveTab('peers')}
            className={`py-2.5 px-3 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'peers'
                ? 'border-[#0b57d0] text-[#0b57d0] dark:border-[#a8c7fa] dark:text-[#a8c7fa]'
                : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            <M3Icon name="people" size={15} />
            <span>Peers ({peers.length + 1})</span>
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`py-2.5 px-3 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'conflicts'
                ? 'border-[#0b57d0] text-[#0b57d0] dark:border-[#a8c7fa] dark:text-[#a8c7fa]'
                : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            <M3Icon name="sync_problem" size={15} />
            <span>Conflict Log ({conflicts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-3 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#0b57d0] text-[#0b57d0] dark:border-[#a8c7fa] dark:text-[#a8c7fa]'
                : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            <M3Icon name="tune" size={15} />
            <span>My Profile & Room</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'peers' && (
            <div className="space-y-3">
              {/* Invite Link Card */}
              <div className="bg-[#f0f2f8] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <M3Icon name="link" size={18} className="text-[#0b57d0] dark:text-[#a8c7fa] shrink-0" />
                  <div className="truncate">
                    <span className="text-xs text-[#191c20] dark:text-white font-medium block">Invite Collaborators</span>
                    <span className="text-[11px] text-[#5d6168] dark:text-[#8e9199] truncate block">
                      Share room link to code simultaneously with live cursors
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCopyInviteLink}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                    copiedLink
                      ? 'bg-[#0f5223] text-white border border-[#308745]'
                      : 'bg-[#d3e3fd] hover:bg-[#c2e7ff] text-[#041e49] dark:bg-[#2b2d30] dark:hover:bg-[#383a3e] dark:text-[#a8c7fa] border border-[#d8dae5] dark:border-[#43474e]/50'
                  }`}
                >
                  <M3Icon name={copiedLink ? 'check' : 'content_copy'} size={14} />
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Active Users List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5d6168] dark:text-[#8e9199] block">
                  Active in Workspace
                </span>

                {/* You */}
                <div className="bg-[#f0f2f8] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: profile.color }}
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-[#001d3d] shadow-sm font-mono"
                    >
                      {profile.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#191c20] dark:text-white">{profile.name}</span>
                        <M3Badge variant="primary">YOU</M3Badge>
                      </div>
                      <span className="text-[11px] text-[#5d6168] dark:text-[#8e9199] font-mono">
                        Host / Active Editor
                      </span>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3ddc84] ring-4 ring-[#3ddc84]/20" />
                </div>

                {/* Other Peers */}
                {peers.length === 0 ? (
                  <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-[#d8dae5] dark:border-[#43474e]/40 bg-[#f8fafd] dark:bg-[#121316]">
                    <M3Icon name="group_add" size={32} className="text-[#5d6168] dark:text-[#8e9199] mx-auto mb-1.5 opacity-60" />
                    <p className="text-xs text-[#191c20] dark:text-[#c4c6d0] font-medium">Waiting for other collaborators...</p>
                    <p className="text-[11px] text-[#5d6168] dark:text-[#8e9199] mt-0.5">
                      Open this URL in another tab or send the link to a teammate to test live editing!
                    </p>
                  </div>
                ) : (
                  peers.map((peer) => (
                    <div
                      key={peer.id}
                      className="bg-[#f0f2f8] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{ backgroundColor: peer.color }}
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-[#001d3d] shadow-sm font-mono"
                        >
                          {peer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#191c20] dark:text-white">{peer.name}</span>
                            <span
                              style={{ color: peer.color }}
                              className="text-[10px] font-mono font-bold"
                            >
                              Live
                            </span>
                          </div>
                          <span className="text-[11px] text-[#5d6168] dark:text-[#8e9199] font-mono">
                            {peer.activeFilePath ? `Editing ${peer.activeFilePath}` : 'Browsing files'}
                            {peer.cursor ? ` (Line ${peer.cursor.line}, Col ${peer.cursor.col})` : ''}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{ backgroundColor: peer.color }}
                        className="w-2.5 h-2.5 rounded-full ring-4 ring-[#0b57d0]/20"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'conflicts' && (
            <div className="space-y-3">
              <div className="bg-[#f0f2f8] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                <M3Icon name="shield" size={18} className="text-[#0f5223] dark:text-[#3ddc84] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-[#191c20] dark:text-white block">Automatic Conflict Resolution Engine</span>
                  <p className="text-[#5d6168] dark:text-[#c4c6d0] leading-relaxed">
                    ZipStudio uses server-authoritative 3-way line reconciliation and monotonic version vectors. When multiple developers type simultaneously in the exact same line, changes are merged automatically without wiping local edits.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5d6168] dark:text-[#8e9199] block">
                  Reconciliation History
                </span>

                {conflicts.length === 0 ? (
                  <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-[#d8dae5] dark:border-[#43474e]/40 bg-[#f8fafd] dark:bg-[#121316]">
                    <M3Icon name="task_alt" size={28} className="text-[#0f5223] dark:text-[#3ddc84] mx-auto mb-1 opacity-70" />
                    <p className="text-xs text-[#191c20] dark:text-[#c4c6d0] font-medium">All edits currently in sync</p>
                    <p className="text-[11px] text-[#5d6168] dark:text-[#8e9199] mt-0.5">
                      No concurrent collisions detected. Live synchronization is 100% harmonious.
                    </p>
                  </div>
                ) : (
                  conflicts.map((c) => (
                    <div
                      key={c.id}
                      className="bg-[#f0f2f8] dark:bg-[#18191c] border border-[#3ddc84]/30 rounded-xl p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#191c20] dark:text-white font-mono">{c.filePath}</span>
                        <span className="text-[10px] text-[#5d6168] dark:text-[#8e9199] font-mono">
                          {new Date(c.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[#0f5223] dark:text-[#b4f3b7]">{c.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              {/* Profile Config */}
              <form onSubmit={handleSaveProfile} className="bg-[#f0f2f8] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#191c20] dark:text-white uppercase tracking-wider">Your Collaborator Profile</h4>
                <div>
                  <label className="text-[11px] text-[#5d6168] dark:text-[#8e9199] block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-white dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-xl px-3 py-1.5 text-xs text-[#191c20] dark:text-white focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#5d6168] dark:text-[#8e9199] block mb-1.5">Cursor & Presence Color</label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setProfile({ ...profile, color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                          profile.color === c ? 'scale-115 ring-2 ring-[#0b57d0] dark:ring-white shadow-lg' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {profile.color === c && <M3Icon name="check" size={14} className="text-[#001d3d]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Save Profile
                </button>
              </form>

              {/* Room Config */}
              <form onSubmit={handleSwitchRoom} className="bg-[#f0f2f8] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#191c20] dark:text-white uppercase tracking-wider">Change Collaboration Room</h4>
                <p className="text-xs text-[#5d6168] dark:text-[#8e9199] leading-relaxed">
                  Join a separate room to collaborate in private with specific colleagues or teammates.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    placeholder="Enter room code or name..."
                    className="flex-1 bg-white dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-xl px-3 py-1.5 text-xs text-[#191c20] dark:text-white font-mono focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Switch Room
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#d8dae5] dark:border-[#43474e]/30 bg-[#f8fafd] dark:bg-[#18191c] flex items-center justify-between text-xs">
          <span className="text-[#5d6168] dark:text-[#8e9199] font-mono text-[11px]">
            WebSocket Status: {isConnected ? 'Connected' : 'Connecting...'}
          </span>
          <button
            onClick={triggerClose}
            className="px-5 py-1.5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white font-semibold cursor-pointer transition-colors shadow-sm"
          >
            {t?.done || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
