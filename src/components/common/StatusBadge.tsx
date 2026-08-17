import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showDot = true 
}) => {
  const normalized = status?.toLowerCase() || '';

  let bgClass = 'bg-stone-100 text-stone-700 border-stone-200';
  let dotClass = 'bg-stone-400';

  if (normalized.includes('done') || normalized.includes('completed') || normalized.includes('approved') || normalized.includes('present') || normalized.includes('active')) {
    bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotClass = 'bg-emerald-500';
  } else if (normalized.includes('progress') || normalized.includes('draft') || normalized.includes('late')) {
    bgClass = 'bg-amber-50 text-amber-900 border-amber-200';
    dotClass = 'bg-amber-500';
  } else if (normalized.includes('returned') || normalized.includes('revision') || normalized.includes('sick') || normalized.includes('absence') || normalized.includes('urgent')) {
    bgClass = 'bg-rose-50 text-rose-800 border-rose-200';
    dotClass = 'bg-rose-500';
  } else if (normalized.includes('explained') || normalized.includes('holiday')) {
    bgClass = 'bg-purple-50 text-purple-800 border-purple-200';
    dotClass = 'bg-purple-500';
  } else if (normalized.includes('not started') || normalized.includes('pending')) {
    bgClass = 'bg-stone-100 text-stone-600 border-stone-200';
    dotClass = 'bg-stone-400';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-semibold'
  };

  return (
    <span 
      id={`status-badge-${status.replace(/\s+/g, '-').toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses[size]} ${bgClass} whitespace-nowrap shadow-xs`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
      )}
      {status}
    </span>
  );
};
