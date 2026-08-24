'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';
import { Icon } from '@iconify/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

interface Props {
  feedbackIssueUrl: string;
  pagePath: string;
}

export function PageFeedback({ feedbackIssueUrl, pagePath }: Props) {
  const [submitted, setSubmitted] = useState<null | 'yes' | 'no'>(null);

  if (submitted === 'yes') {
    return (
      <div className="mt-10 pt-6 border-t border-fd-border flex items-center gap-2 text-sm text-fd-muted-foreground not-prose">
        <Icon icon="ph:heart-duotone" width={16} aria-hidden="true" />
        Thanks for the feedback.
      </div>
    );
  }

  return (
    <div className="mt-10 pt-6 border-t border-fd-border flex flex-wrap items-center gap-3 not-prose">
      <span className="text-sm text-fd-muted-foreground">Was this page helpful?</span>
      <button
        type="button"
        onClick={() => {
          track('docs_page_feedback', { page: pagePath, helpful: true });
          setSubmitted('yes');
        }}
        className={`${buttonVariants({ color: 'secondary', size: 'sm' })} gap-1.5`}
        aria-label="Yes, this page was helpful"
      >
        <Icon icon="ph:thumbs-up-duotone" width={14} aria-hidden="true" />
        Yes
      </button>
      <a
        href={feedbackIssueUrl}
        target="_blank"
        rel="noreferrer noopener"
        onClick={() => {
          track('docs_page_feedback', { page: pagePath, helpful: false });
          setSubmitted('no');
        }}
        className={`${buttonVariants({ color: 'secondary', size: 'sm' })} gap-1.5`}
        aria-label="No, this page needs improvement"
      >
        <Icon icon="ph:thumbs-down-duotone" width={14} aria-hidden="true" />
        No
      </a>
    </div>
  );
}
