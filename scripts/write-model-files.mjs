import { writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { RAW_MODEL_CHUNK_BYTES, rawModelPaths } from '../lib/anatomy/model-format.mjs';

export async function writeModelFiles(system, data, directory = 'public/models') {
  const paths = rawModelPaths(system, data.length);
  for (const [index, name] of paths.entries()) {
    await writeFile(join(directory, name), data.subarray(index * RAW_MODEL_CHUNK_BYTES, (index + 1) * RAW_MODEL_CHUNK_BYTES));
  }
  await writeFile(join(directory, `${system}.mesh`), gzipSync(data, { level: 9, mtime: 0 }));
  if (paths.length > 1) await rm(join(directory, `${system}.bin`), { force: true });
}
