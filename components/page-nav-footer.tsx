'use client';

import { useMemo } from 'react';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useFooterItems } from 'fumadocs-ui/utils/use-footer-items';
import { Icon } from '@iconify/react';
import type { ComponentProps } from 'react';
import type * as PageTree from 'fumadocs-core/page-tree';

type FooterItem = Pick<PageTree.Item, 'name' | 'description' | 'url'>;

interface Props extends ComponentProps<'nav'> {
  items?: { previous?: FooterItem; next?: FooterItem };
}

export function PageNavFooter({ items, className, ...rest }: Props) {
  const list = useFooterItems();
  const pathname = usePathname();

  const { previous, next } = useMemo(() => {
    if (items) return items;
    const idx = list.findIndex((item) => item.url === pathname);
    if (idx === -1) return { previous: undefined, next: undefined };
    return {
      previous: list[idx - 1],
      next: list[idx + 1],
    };
  }, [list, items, pathname]);

  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Page navigation"
      className={`not-prose mt-12 grid gap-3 sm:grid-cols-2 ${className ?? ''}`}
      {...rest}
    >
      {previous ? (
        <Link
          href={previous.url}
          className="group flex flex-col gap-1 rounded-lg border border-fd-border p-4 transition-colors hover:border-fd-primary/40 hover:bg-fd-accent/30"
        >
          <span className="text-xs uppercase tracking-wider text-fd-muted-foreground inline-flex items-center gap-1.5">
            <Icon icon="ph:arrow-left-bold" width={11} aria-hidden="true" />
            Previous
          </span>
          <span className="font-medium text-fd-foreground truncate">{previous.name}</span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
      {next ? (
        <Link
          href={next.url}
          className="group flex flex-col gap-1 rounded-lg border border-fd-border p-4 transition-colors hover:border-fd-primary/40 hover:bg-fd-accent/30 sm:text-right sm:items-end"
        >
          <span className="text-xs uppercase tracking-wider text-fd-muted-foreground inline-flex items-center gap-1.5 sm:flex-row-reverse">
            <Icon icon="ph:arrow-right-bold" width={11} aria-hidden="true" />
            Next
          </span>
          <span className="font-medium text-fd-foreground truncate">{next.name}</span>
        </Link>
      ) : null}
    </nav>
  );
}
