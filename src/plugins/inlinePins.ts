import { readFileSync } from 'fs';
import { resolve } from 'path';
import { type Plugin } from 'vite';

/**
 * Inlines pin data (lat/lng/id) into index.html as window.__PINS__
 * so map markers render without any network fetch.
 */
export function inlinePins(): Plugin {
  return {
    name: 'inline-pins',
    transformIndexHtml(_, ctx) {
      const root = ctx.server?.config.root ?? process.cwd();
      const pinsPath = resolve(root, 'public/data/pins.json');
      const pins = readFileSync(pinsPath, 'utf8');
      return [
        {
          tag: 'script',
          children: `window.__PINS__=${pins};`,
          injectTo: 'head',
        },
      ];
    },
  };
}
