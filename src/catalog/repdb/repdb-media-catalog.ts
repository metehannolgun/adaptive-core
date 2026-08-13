import mediaManifestJson from "./generated/media-manifest.json";
import selectedRecordsJson from "./generated/selected-records.json";
import { buildRepDbMediaCatalog } from "./build-repdb-media-catalog";
import type {
  RepDbMediaManifest,
  RepDbSelectedRecordsSnapshot,
} from "./types";

const mediaManifest: RepDbMediaManifest = mediaManifestJson;
const selectedRecords: RepDbSelectedRecordsSnapshot = selectedRecordsJson;
const result = buildRepDbMediaCatalog(
  selectedRecords.records,
  mediaManifest,
  selectedRecords.source.acquiredAt,
);

if (!result.ok) {
  throw new Error(
    `RepDB media catalog is invalid: ${JSON.stringify(result.failures)}`,
  );
}

export const REPDB_MEDIA_CATALOG = result.media;
