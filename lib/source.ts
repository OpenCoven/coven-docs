import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';
import { createElement } from 'react';

const lucideIcons = {
  LuBookOpen: icons.BookOpen,
  LuRocket: icons.Rocket,
  LuZap: icons.Zap,
  LuWand2: icons.Wand2,
  LuCpu: icons.Cpu,
  LuShield: icons.Shield,
  LuCode2: icons.Code2,
  LuNetwork: icons.Network,
  LuUsers: icons.Users,
  LuMemoryStick: icons.MemoryStick,
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
