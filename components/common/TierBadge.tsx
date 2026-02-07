'use client';

import { normalizeTier, SubscriptionTierKey, LegacyTierKey } from '@/lib/models/Subscription';

interface TierBadgeProps {
  tier: SubscriptionTierKey | LegacyTierKey | undefined | null;
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const normalizedTier = normalizeTier(tier);

  // Don't show badge for basic tier
  if (normalizedTier === 'basic') return null;

  const isPro = normalizedTier === 'pro';

  // Pro: purple gradient, Premium: amber gradient
  const gradientClass = isPro
    ? 'from-purple-500 to-indigo-600'
    : 'from-amber-400 to-orange-500';

  const sizeClass = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px] gap-0.5'
    : 'px-2 py-1 text-xs gap-1';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full
        bg-gradient-to-r ${gradientClass} text-white ${sizeClass}
        shadow-sm relative overflow-hidden`}
    >
      {/* Shimmer overlay */}
      <span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{
          animation: 'shimmer 2s ease-in-out infinite',
          transform: 'translateX(-100%)',
        }}
      />

      {/* Icon + Text */}
      <span className="relative flex items-center gap-1">
        {isPro ? <CrownIcon size={size} /> : <StarIcon size={size} />}
        {isPro ? 'PRO' : 'PREMIUM'}
      </span>

      {/* Keyframes for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </span>
  );
}

// Crown icon for Pro tier
function CrownIcon({ size }: { size: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 10 : 12;
  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}

// Star/sparkle icon for Premium tier
function StarIcon({ size }: { size: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 10 : 12;
  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

export default TierBadge;
