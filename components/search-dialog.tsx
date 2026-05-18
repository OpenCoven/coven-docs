'use client';

import { useMemo, useState } from 'react';
import { useDocsSearch } from 'fumadocs-core/search/client';
import type { SearchLink, SharedProps } from 'fumadocs-ui/contexts/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from 'fumadocs-ui/components/dialog/search';

const filters = [
  { name: 'All', value: undefined, description: 'Search every Coven doc' },
  { name: 'Guide', value: 'guide', description: 'Only framework and setup guides' },
  { name: 'Familiars', value: 'familiars', description: 'Only familiar runtime docs' },
  { name: 'Reference', value: 'reference', description: 'Only API and safety reference' },
  { name: 'Future Hosted API', value: 'openapi', description: 'Only hosted API placeholders' },
] as const;

export function CovenSearchDialog({
  links = [],
  ...props
}: SharedProps & { links?: SearchLink[] }) {
  const { locale } = useI18n();
  const [tag, setTag] = useState<string | undefined>();
  const { search, setSearch, query } = useDocsSearch({
    type: 'fetch',
    locale,
    tag,
  });

  const defaultItems = useMemo(() => {
    if (links.length === 0) return null;

    return links.map(([name, link]) => ({
      type: 'page' as const,
      id: name,
      content: name,
      url: link,
    }));
  }, [links]);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : defaultItems} />
      </SearchDialogContent>
      <SearchDialogFooter>
        <div className="grid w-full gap-2">
          <div className="text-xs font-medium text-fd-muted-foreground">Filter</div>
          <div className="grid gap-1 sm:grid-cols-2">
            {filters.map((filter) => {
              const active = filter.value === tag;

              return (
                <button
                  key={filter.name}
                  type="button"
                  data-active={active}
                  className="rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-fd-accent data-[active=true]:border-fd-primary data-[active=true]:bg-fd-accent"
                  onClick={() => setTag(filter.value)}
                >
                  <span className="block font-medium text-fd-foreground">{filter.name}</span>
                  <span className="block text-fd-muted-foreground">{filter.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SearchDialogFooter>
    </SearchDialog>
  );
}
