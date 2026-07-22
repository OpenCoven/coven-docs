import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';
import { createElement } from 'react';
import { openapi } from '@/lib/openapi';

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
  LuServer: icons.Server,
  LuTerminal: icons.Terminal,
  LuCable: icons.Cable,
  LuBrainCircuit: icons.BrainCircuit,
  LuCompass: icons.Compass,
};

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [openapi.loaderPlugin()],
  icon(icon) {
    if (!icon) return;
    if (icon in lucideIcons)
      return createElement(lucideIcons[icon as keyof typeof lucideIcons]);
  },
});
