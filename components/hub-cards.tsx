import { Cards, Card } from 'fumadocs-ui/components/card';
import type { Folder, Item, Node } from 'fumadocs-core/page-tree';
import { source } from '@/lib/source';

function findFolderByHref(nodes: Node[], href: string): Folder | null {
  for (const node of nodes) {
    if (node.type !== 'folder') continue;
    if (node.index?.url === href) return node;
    const nested = findFolderByHref(node.children, href);
    if (nested) return nested;
  }
  return null;
}

interface HubCardsProps {
  href: string;
}

export function HubCards({ href }: HubCardsProps) {
  const tree = source.getPageTree();
  const folder = findFolderByHref(tree.children, href);
  if (!folder) return null;

  const items = folder.children.filter((n): n is Item => n.type === 'page');
  if (items.length === 0) return null;

  return (
    <Cards>
      {items.map((item) => (
        <Card
          key={item.url}
          href={item.url}
          title={item.name}
          description={item.description}
          icon={item.icon}
        />
      ))}
    </Cards>
  );
}
