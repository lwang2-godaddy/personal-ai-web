'use client';

import React from 'react';

interface InfoGridItem {
  label: string;
  value: string;
  mono?: boolean;
}

interface InfoGridProps {
  items: InfoGridItem[];
}

export default function InfoGrid({ items }: InfoGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-50 rounded-md p-2">
          <span className="text-gray-500 block text-xs">{item.label}</span>
          <span
            className={`text-xs text-gray-900 break-all ${item.mono ? 'font-mono' : ''}`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
