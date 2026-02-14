'use client';

import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  itemCount: number;
  hasMore: boolean;
  itemLabel?: string;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function PaginationControls({
  currentPage,
  itemCount,
  hasMore,
  itemLabel = 'items',
  onPrevPage,
  onNextPage,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Page {currentPage + 1} &middot; Showing {itemCount} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevPage}
          disabled={currentPage === 0}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Previous
        </button>
        <button
          onClick={onNextPage}
          disabled={!hasMore}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
