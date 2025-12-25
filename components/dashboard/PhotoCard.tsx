import { PhotoMemory } from '@/lib/models';
import Image from 'next/image';

interface PhotoCardProps {
  data: PhotoMemory[];
}

export function PhotoCard({ data }: PhotoCardProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📸 Recent Photos
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No photos uploaded yet. Use the mobile app to capture and sync your photo memories.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        📸 Recent Photos
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 group"
          >
            <Image
              src={item.thumbnailUrl}
              alt={item.userDescription || item.autoDescription}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity duration-200 flex items-end p-2">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-xs text-white line-clamp-2">
                  {item.userDescription || item.autoDescription}
                </p>
                {item.activity && (
                  <span className="inline-block mt-1 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                    {item.activity}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
