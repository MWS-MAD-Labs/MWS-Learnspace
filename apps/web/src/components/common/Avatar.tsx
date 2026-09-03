import React, { useState } from 'react';
import { isSafeAvatarPath } from '@learnspace/contracts';

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

function nameParts(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

function accessibleName(name: string): string {
  return nameParts(name).join(' ') || 'Avatar';
}

function initials(name: string): string {
  const parts = nameParts(name);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  className = '',
}) => {
  const safeSrc = isSafeAvatarPath(src) ? src : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const label = accessibleName(name);

  const sharedClassName = `shrink-0 overflow-hidden bg-stone-100 text-stone-600 ${className}`;

  if (safeSrc && safeSrc !== failedSrc) {
    return (
      <img
        alt={label}
        className={`${sharedClassName} object-cover`}
        src={safeSrc}
        onError={() => setFailedSrc(safeSrc)}
      />
    );
  }

  return (
    <span
      aria-label={label}
      className={`${sharedClassName} inline-grid place-items-center font-bold uppercase`}
      role="img"
    >
      {initials(name)}
    </span>
  );
};
