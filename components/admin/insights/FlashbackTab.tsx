'use client';

interface FlashbackTabProps {
  onSaving?: (saving: boolean) => void;
}

/**
 * Flashback Tab - Documentation for the random memory feature
 * This is a mobile-only feature that surfaces old memories using weighted selection
 */
export default function FlashbackTab({ onSaving }: FlashbackTabProps) {
  return (
    <div className="space-y-6">
      {/* Feature Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Flashback</h2>
            <p className="text-sm text-gray-500">Random memory feature with intelligent weighting</p>
          </div>
        </div>

        <div className="mb-6">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Mobile App Feature
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-gray-600">
          <p>
            The Flashback feature (formerly "Surprise Me") surfaces random memories from the user's feed
            with intelligent weighting that favors older, less-viewed memories.
          </p>
        </div>
      </div>

      {/* Weighting Algorithm */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Weighting Algorithm</h3>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Selection Weights</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Age &gt; 6 months</span>
                <span className="font-mono text-gray-800">× 2.0</span>
              </div>
              <div className="flex justify-between">
                <span>Age 3-6 months</span>
                <span className="font-mono text-gray-800">× 1.5</span>
              </div>
              <div className="flex justify-between">
                <span>Has photos</span>
                <span className="font-mono text-gray-800">× 1.5</span>
              </div>
              <div className="flex justify-between">
                <span>Photo type</span>
                <span className="font-mono text-gray-800">× 1.3</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Formula:</strong> weight = ageWeight × hasMediaWeight × typeWeight
            </p>
            <p>
              Items are selected using weighted random selection, where higher weights increase
              the probability of being chosen.
            </p>
          </div>
        </div>
      </div>

      {/* Time Context Labels */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Time Context Labels</h3>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            When a memory is shown, a contextual time label appears to help users understand
            when the memory is from:
          </p>

          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Condition</th>
                  <th className="pb-2">Label Example</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="py-1">Same month/day, different year</td>
                  <td className="py-1 font-medium">"1 year ago today"</td>
                </tr>
                <tr>
                  <td className="py-1">1+ years ago</td>
                  <td className="py-1 font-medium">"About 2 years ago"</td>
                </tr>
                <tr>
                  <td className="py-1">6+ months ago</td>
                  <td className="py-1 font-medium">"6 months ago"</td>
                </tr>
                <tr>
                  <td className="py-1">3+ months ago</td>
                  <td className="py-1 font-medium">"3 months ago"</td>
                </tr>
                <tr>
                  <td className="py-1">1+ months ago</td>
                  <td className="py-1 font-medium">"2 months ago"</td>
                </tr>
                <tr>
                  <td className="py-1">&lt; 1 month ago</td>
                  <td className="py-1 text-gray-400">No label shown</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Translations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Localization</h3>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            The feature name and labels are fully translated:
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">English</div>
              <div className="font-medium">Flashback</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Chinese</div>
              <div className="font-medium">往事回闪</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Japanese</div>
              <div className="font-medium">フラッシュバック</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Spanish</div>
              <div className="font-medium">Flashback</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">French</div>
              <div className="font-medium">Flashback</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">German</div>
              <div className="font-medium">Flashback</div>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Implementation</h3>

        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Mobile App Files</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code className="text-xs bg-gray-100 px-1 rounded">HomeFeedScreen.tsx</code> - Flashback button and weighted selection</li>
              <li><code className="text-xs bg-gray-100 px-1 rounded">RandomMemoryModal.tsx</code> - Modal with time context labels</li>
              <li><code className="text-xs bg-gray-100 px-1 rounded">locales/*/common.json</code> - Translations (6 languages)</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800">
              <strong>Note:</strong> This feature is entirely client-side. No server API calls or
              database changes are needed. The weighted selection runs on the existing feed data.
            </p>
          </div>
        </div>
      </div>

      {/* Future Improvements */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Future Improvements</h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-gray-400">Phase 2</span>
            <div>
              <h4 className="font-medium text-gray-800">Type/Category Filters</h4>
              <p className="text-sm text-gray-600">Allow users to filter by "Photos Only", "Voice Notes", "Older than 1 year"</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-gray-400">Phase 2</span>
            <div>
              <h4 className="font-medium text-gray-800">Memory Streak Gamification</h4>
              <p className="text-sm text-gray-600">Track "memories rediscovered this week" with badges</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-gray-400">Phase 3</span>
            <div>
              <h4 className="font-medium text-gray-800">AI-Powered Related Memories</h4>
              <p className="text-sm text-gray-600">After viewing one memory, offer related memories by location, people, or mood</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-gray-400">Future</span>
            <div>
              <h4 className="font-medium text-gray-800">Track surfacedCount</h4>
              <p className="text-sm text-gray-600">Use Memory model's surfacedCount field to avoid showing the same memory repeatedly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
