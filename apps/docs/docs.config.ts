import { defineConfig, Icon } from 'fumadocs-core/config';
import { searchGoogleCustom } from 'fumadocs-core/search/google';

export default defineConfig({
  baseUrl: 'https://docs.coven.dev',
  title: 'Coven Documentation',
  description: 'Persistent AI familiars. Composable. Observable. Publishable.',
  ogImage: '/og.png',
  logo: {
    dark: '/logo-dark.svg',
    light: '/logo-light.svg',
  },
  social: {
    github: 'https://github.com/OpenCoven/coven',
    discord: 'https://discord.gg/opencoven',
    twitter: 'https://x.com/OpenCvn',
  },
  nav: [
    {
      title: 'Docs',
      url: '/docs',
    },
    {
      title: 'API',
      url: '/api',
    },
    {
      title: 'Community',
      url: '/community',
    },
  ],
  search: searchGoogleCustom({
    apiKey: process.env.GOOGLE_SEARCH_API_KEY,
    engineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
  }),
  theme: {
    colorScheme: 'dark',
    accentColor: '#9A8ECD',
    radius: 0.5,
  },
});
