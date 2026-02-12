import { promises as fs } from 'fs';
import * as path from 'path';

export async function safeUnlinkByRelativePath(relativePath: string) {
  if (!relativePath) return;

  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');

  try {
    await fs.unlink(normalized);
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
  }
}
