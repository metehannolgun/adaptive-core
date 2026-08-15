export function stableSeedRank(
  seed: string,
  ...parts: readonly string[]
): number {
  let hash = 2_166_136_261;

  for (const character of `${seed}:${parts.join(":")}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}
