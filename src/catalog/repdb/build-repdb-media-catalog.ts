import { mapRepDbMedia } from "./map-repdb-media";
import type {
  RepDbExerciseRecord,
  RepDbMediaCatalogFailure,
  RepDbMediaCatalogResult,
  RepDbMediaManifest,
} from "./types";
import type { ExerciseMedia } from "../types";

export function buildRepDbMediaCatalog(
  records: readonly RepDbExerciseRecord[],
  manifest: RepDbMediaManifest,
  acquiredAt: string,
): RepDbMediaCatalogResult {
  const media: ExerciseMedia[] = [];
  const failures: RepDbMediaCatalogFailure[] = [];

  for (const record of records) {
    const result = mapRepDbMedia(record, manifest, acquiredAt);

    if (result.ok) {
      media.push(result.media);
    } else {
      failures.push({
        exerciseId: record.id,
        issues: result.issues,
      });
    }
  }

  return failures.length > 0
    ? { ok: false, failures }
    : { ok: true, media };
}
