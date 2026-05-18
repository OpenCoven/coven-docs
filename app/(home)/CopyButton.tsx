'use client';

import { Icon } from '@iconify/react';
import { useState } from 'react';
import s from './home.module.css';

const VIOLET = '#9A8ECD';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator?.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      type="button"
      className={s.pkgCopy}
      title={`Copy: ${text}`}
      onClick={handleCopy}
      style={{ color: copied ? '#6ECB8A' : undefined }}
    >
      <Icon icon={copied ? 'ph:check-bold' : 'ph:copy-duotone'} width={15} color={copied ? '#6ECB8A' : VIOLET} />
    </button>
  );
}
