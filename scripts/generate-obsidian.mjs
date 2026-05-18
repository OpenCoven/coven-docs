import { fromVault } from 'fumadocs-obsidian';

const dir = process.env.OBSIDIAN_VAULT_DIR;

if (!dir) {
  console.error('Set OBSIDIAN_VAULT_DIR to the vault directory before running this script.');
  process.exit(1);
}

await fromVault({
  dir,
  out: {
    docs: 'content/docs',
    assets: 'public/obsidian',
  },
});
