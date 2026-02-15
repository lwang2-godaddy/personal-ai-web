'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  EMOJI_CATEGORIES,
  EMOJIS,
  searchEmojis,
  getEmojisByCategory,
  EmojiItem,
} from '@/lib/data/emojiData';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
  selectedEmoji?: string;
}

const RECENT_EMOJIS_KEY = 'admin-recent-emojis';
const MAX_RECENT = 20;

export default function EmojiPicker({
  onSelect,
  isOpen,
  onClose,
  selectedEmoji,
}: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('recent');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  // Load recent emojis from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
      if (stored) {
        try {
          setRecentEmojis(JSON.parse(stored));
        } catch {
          setRecentEmojis([]);
        }
      }
    }
  }, []);

  // Reset search and category when picker opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveCategory(recentEmojis.length > 0 ? 'recent' : 'activity');
    }
  }, [isOpen, recentEmojis.length]);

  // Filter emojis based on search or category
  const filteredEmojis = useMemo(() => {
    if (search.trim()) {
      return searchEmojis(search);
    }

    if (activeCategory === 'recent') {
      // Map recent emoji strings to EmojiItem objects
      return recentEmojis
        .map((emoji) => EMOJIS.find((e) => e.emoji === emoji))
        .filter((e): e is EmojiItem => e !== undefined);
    }

    return getEmojisByCategory(activeCategory);
  }, [search, activeCategory, recentEmojis]);

  const handleSelectEmoji = (emoji: string) => {
    // Update recent emojis
    const updated = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(
      0,
      MAX_RECENT
    );
    setRecentEmojis(updated);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
    }

    onSelect(emoji);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute z-50 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Search bar */}
      <div className="p-2 border-b border-gray-100">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setSearch('');
            }}
            title={cat.name}
            className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-lg transition-colors ${
              activeCategory === cat.id
                ? 'bg-indigo-100 ring-2 ring-indigo-500'
                : 'hover:bg-gray-100'
            }`}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 h-64 overflow-y-auto">
        {filteredEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            {search ? (
              <>
                <span className="text-2xl mb-2">🔍</span>
                <span className="text-sm">No emojis found for "{search}"</span>
              </>
            ) : activeCategory === 'recent' ? (
              <>
                <span className="text-2xl mb-2">🕐</span>
                <span className="text-sm">No recent emojis yet</span>
                <span className="text-xs mt-1">
                  Select an emoji to add to recent
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl mb-2">📭</span>
                <span className="text-sm">No emojis in this category</span>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Category label */}
            {!search && (
              <div className="text-xs font-medium text-gray-500 mb-2 px-1">
                {EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.name ||
                  'Results'}
              </div>
            )}

            {/* Emoji grid */}
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((item) => (
                <button
                  key={item.emoji + item.name}
                  onClick={() => handleSelectEmoji(item.emoji)}
                  title={item.name}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-xl hover:bg-gray-100 transition-colors ${
                    selectedEmoji === item.emoji
                      ? 'bg-indigo-100 ring-2 ring-indigo-500'
                      : ''
                  }`}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer with close button */}
      <div className="flex justify-between items-center p-2 border-t border-gray-100 bg-gray-50">
        <span className="text-xs text-gray-500">
          {filteredEmojis.length} emoji{filteredEmojis.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
