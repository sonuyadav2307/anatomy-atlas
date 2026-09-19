// Keep fallback assets below the hosting platform's 25 MiB per-file limit.
export const RAW_MODEL_CHUNK_BYTES = 20 * 1024 * 1024;

/** @param {string} system @param {number} byteLength @returns {string[]} */
export function rawModelPaths(system, byteLength) {
  if (byteLength <= RAW_MODEL_CHUNK_BYTES) return [`${system}.bin`];
  return Array.from(
    { length: Math.ceil(byteLength / RAW_MODEL_CHUNK_BYTES) },
    (_, index) => `${system}.part-${index}.bin`,
  );
}
