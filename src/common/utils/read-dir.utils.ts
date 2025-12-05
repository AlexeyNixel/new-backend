import { lstat, readdir } from 'node:fs/promises';
import * as path from 'path';

export async function readDirRecursive(dir) {
  let results = [];
  const entries = await readdir(dir);

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    const entryStat = await lstat(entryPath);

    if (entryStat.isDirectory()) {
      const newEntries = await readDirRecursive(entryPath);
      results = results.concat(newEntries);
    } else {
      //@ts-ignore
      results.push(entryPath);
    }
  }

  return results;
}
