'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';

// ============================================================================
// Types
// ============================================================================

interface UserOption {
  id: string;
  email: string;
  displayName?: string;
}

interface ContentCounts {
  textNotes: number;
  voiceNotes: number;
  photoMemories: number;
}

interface TextNote {
  id: string;
  title?: string;
  content: string;
  type?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  embeddingId?: string;
  embeddingError?: string;
  location?: { latitude: number; longitude: number; address?: string };
}

interface VoiceNote {
  id: string;
  transcription?: string;
  duration?: number;
  audioUrl?: string;
  createdAt?: string;
  embeddingId?: string;
  embeddingError?: string;
  language?: string;
  location?: { latitude: number; longitude: number; address?: string };
}

interface PhotoMemory {
  id: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  autoDescription?: string;
  userCaption?: string;
  takenAt?: string;
  createdAt?: string;
  width?: number;
  height?: number;
  embeddingId?: string;
  embeddingError?: string;
  location?: { latitude: number; longitude: number; address?: string };
}

interface UserContentResponse {
  textNotes: TextNote[];
  voiceNotes: VoiceNote[];
  photoMemories: PhotoMemory[];
  counts: ContentCounts;
}

// ============================================================================
// Constants
// ============================================================================

type TabKey = 'textNotes' | 'voiceNotes' | 'photoMemories';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'textNotes', label: 'Text Notes', icon: '📝' },
  { key: 'voiceNotes', label: 'Voice Notes', icon: '🎤' },
  { key: 'photoMemories', label: 'Photos', icon: '📸' },
];

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function truncate(text: string | undefined, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

function EmbeddingBadge({ embeddingId, embeddingError }: { embeddingId?: string; embeddingError?: string }) {
  if (embeddingId) {
    return (
      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
        Indexed
      </span>
    );
  }
  if (embeddingError) {
    return (
      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800" title={embeddingError}>
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
      Processing
    </span>
  );
}

// ============================================================================
// Detail Panel Components
// ============================================================================

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 font-medium min-w-[120px]">{label}:</span>
      <span className="text-gray-900 break-all">{value}</span>
    </div>
  );
}

function LocationInfo({ location }: { location?: { latitude: number; longitude: number; address?: string } }) {
  if (!location) return null;
  return (
    <div className="text-sm">
      <span className="text-gray-500 font-medium">Location: </span>
      <span className="text-gray-900">
        {location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
      </span>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function UserContentPage() {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);

  // Users
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Content
  const [content, setContent] = useState<UserContentResponse | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI
  const [activeTab, setActiveTab] = useState<TabKey>('textNotes');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ============================================================================
  // Fetch Users
  // ============================================================================

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchUsers();
    }
  }, [authLoading, isAuthenticated]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await apiGet<{ users: UserOption[] }>('/api/admin/users?limit=100');
      setUsers(data.users);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ============================================================================
  // Fetch Content
  // ============================================================================

  const fetchContent = useCallback(async () => {
    if (!selectedUserId) return;

    try {
      setLoadingContent(true);
      setError(null);
      setExpandedId(null);

      const data = await apiGet<UserContentResponse>(
        `/api/admin/user-content?userId=${selectedUserId}&type=all&limit=50`
      );
      setContent(data);
    } catch (err: any) {
      console.error('Failed to fetch content:', err);
      setError(err.message || 'Failed to load user content');
    } finally {
      setLoadingContent(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      fetchContent();
    } else {
      setContent(null);
    }
  }, [selectedUserId, fetchContent]);

  // ============================================================================
  // Filtered Users
  // ============================================================================

  const filteredUsers = users.filter(
    (u) =>
      (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  // ============================================================================
  // Toggle Expand
  // ============================================================================

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700">Admin</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">User Content</span>
      </nav>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Content</h1>
        <p className="mt-1 text-gray-600">
          View a user's original feed — text notes, voice notes, and photos with embedding status.
        </p>
      </div>

      {/* User Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
          Select User
        </label>
        <div className="relative">
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {userSearch && filteredUsers.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setUserSearch('');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    selectedUserId === u.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{u.displayName || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {!userSearch && (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={loadingUsers}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">
              {loadingUsers ? 'Loading users...' : '-- Select a user --'}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName || 'Unknown'} ({u.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Bar */}
      {content && (
        <div className="grid grid-cols-3 gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`bg-white rounded-lg shadow-sm border p-4 text-center transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 ring-2 ring-indigo-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{tab.icon}</div>
              <div className="text-2xl font-bold text-gray-900">
                {content.counts[tab.key]}
              </div>
              <div className="text-sm text-gray-500">{tab.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loadingContent && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading content...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchContent}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* No User Selected */}
      {!selectedUserId && !loadingUsers && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">Select a user to view their content</p>
        </div>
      )}

      {/* Content Tabs & List */}
      {content && !loadingContent && !error && (
        <>
          {/* Tab Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex border-b border-gray-200">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
                  className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors ${
                    activeTab === tab.key
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon} {tab.label} ({content.counts[tab.key]})
                </button>
              ))}
            </div>

            {/* Text Notes Tab */}
            {activeTab === 'textNotes' && (
              <div>
                {content.textNotes.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">No text notes found</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {content.textNotes.map((note) => (
                      <div key={note.id}>
                        <button
                          onClick={() => toggleExpand(note.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 truncate">
                                  {note.title || truncate(note.content, 60) || 'Untitled'}
                                </span>
                                {note.type && (
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    {note.type}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-0.5">
                                {note.title ? truncate(note.content, 100) : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4 shrink-0">
                              {note.tags && note.tags.length > 0 && (
                                <span className="text-xs text-gray-400">{note.tags.length} tags</span>
                              )}
                              <EmbeddingBadge embeddingId={note.embeddingId} embeddingError={note.embeddingError} />
                              <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                              <span className="text-gray-400">{expandedId === note.id ? '▼' : '▶'}</span>
                            </div>
                          </div>
                        </button>
                        {expandedId === note.id && (
                          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-2">
                            <div className="pt-3">
                              <div className="text-sm font-medium text-gray-700 mb-1">Full Content:</div>
                              <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
                                {note.content}
                              </div>
                            </div>
                            <MetadataRow label="ID" value={note.id} />
                            <MetadataRow label="Type" value={note.type} />
                            <MetadataRow label="Created" value={formatDate(note.createdAt)} />
                            <MetadataRow label="Updated" value={formatDate(note.updatedAt)} />
                            <MetadataRow label="Tags" value={note.tags?.join(', ')} />
                            <MetadataRow label="Embedding ID" value={note.embeddingId} />
                            <MetadataRow label="Embedding Error" value={note.embeddingError} />
                            <LocationInfo location={note.location} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Voice Notes Tab */}
            {activeTab === 'voiceNotes' && (
              <div>
                {content.voiceNotes.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">No voice notes found</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {content.voiceNotes.map((note) => (
                      <div key={note.id}>
                        <button
                          onClick={() => toggleExpand(note.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-900 truncate block">
                                {truncate(note.transcription, 100) || 'No transcription'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 ml-4 shrink-0">
                              <span className="text-xs text-gray-400">{formatDuration(note.duration)}</span>
                              <EmbeddingBadge embeddingId={note.embeddingId} embeddingError={note.embeddingError} />
                              <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                              {note.audioUrl && (
                                <a
                                  href={note.audioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Audio
                                </a>
                              )}
                              <span className="text-gray-400">{expandedId === note.id ? '▼' : '▶'}</span>
                            </div>
                          </div>
                        </button>
                        {expandedId === note.id && (
                          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-2">
                            {note.transcription && (
                              <div className="pt-3">
                                <div className="text-sm font-medium text-gray-700 mb-1">Full Transcription:</div>
                                <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
                                  {note.transcription}
                                </div>
                              </div>
                            )}
                            <MetadataRow label="ID" value={note.id} />
                            <MetadataRow label="Duration" value={formatDuration(note.duration)} />
                            <MetadataRow label="Language" value={note.language} />
                            <MetadataRow label="Created" value={formatDate(note.createdAt)} />
                            <MetadataRow label="Embedding ID" value={note.embeddingId} />
                            <MetadataRow label="Embedding Error" value={note.embeddingError} />
                            {note.audioUrl && (
                              <MetadataRow
                                label="Audio URL"
                                value={
                                  <a href={note.audioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                    Open Audio File
                                  </a>
                                }
                              />
                            )}
                            <LocationInfo location={note.location} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === 'photoMemories' && (
              <div>
                {content.photoMemories.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">No photos found</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {content.photoMemories.map((photo) => (
                      <div key={photo.id}>
                        <button
                          onClick={() => toggleExpand(photo.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded overflow-hidden bg-gray-200 shrink-0">
                              {(photo.thumbnailUrl || photo.imageUrl) ? (
                                <img
                                  src={photo.thumbnailUrl || photo.imageUrl}
                                  alt="Photo"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                                  📷
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-900 truncate block">
                                {truncate(photo.autoDescription || photo.userCaption, 100) || 'No description'}
                              </span>
                              {photo.width && photo.height && (
                                <span className="text-xs text-gray-400">{photo.width}x{photo.height}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <EmbeddingBadge embeddingId={photo.embeddingId} embeddingError={photo.embeddingError} />
                              <span className="text-xs text-gray-400">{formatDate(photo.takenAt || photo.createdAt)}</span>
                              <span className="text-gray-400">{expandedId === photo.id ? '▼' : '▶'}</span>
                            </div>
                          </div>
                        </button>
                        {expandedId === photo.id && (
                          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-2">
                            {/* Full image */}
                            {(photo.imageUrl || photo.thumbnailUrl) && (
                              <div className="pt-3">
                                <img
                                  src={photo.imageUrl || photo.thumbnailUrl}
                                  alt="Full photo"
                                  className="max-w-md max-h-80 rounded border border-gray-200 object-contain"
                                />
                              </div>
                            )}
                            {photo.autoDescription && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-1">Auto Description:</div>
                                <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                                  {photo.autoDescription}
                                </div>
                              </div>
                            )}
                            {photo.userCaption && (
                              <MetadataRow label="User Caption" value={photo.userCaption} />
                            )}
                            <MetadataRow label="ID" value={photo.id} />
                            <MetadataRow label="Taken At" value={formatDate(photo.takenAt)} />
                            <MetadataRow label="Created" value={formatDate(photo.createdAt)} />
                            <MetadataRow label="Dimensions" value={photo.width && photo.height ? `${photo.width} x ${photo.height}` : undefined} />
                            <MetadataRow label="Embedding ID" value={photo.embeddingId} />
                            <MetadataRow label="Embedding Error" value={photo.embeddingError} />
                            <LocationInfo location={photo.location} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
