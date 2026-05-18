import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';
import { createElement } from 'react';

const lucideIcons = {
  LuBookOpen: icons.BookOpen,
  LuRocket: icons.Rocket,
  LuZap: icons.Zap,
  LuWand: icons.Wand,
  LuCpu: icons.Cpu,
  LuShield: icons.Shield,
  LuCode: icons.Code,
  LuNetwork: icons.Network,
  LuUsers: icons.Users,
};

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  icon(icon) {
    if (!icon) return;
    if (icon in lucideIcons)
      return createElement(lucideIcons[icon as keyof typeof lucideIcons]);
  },
});
