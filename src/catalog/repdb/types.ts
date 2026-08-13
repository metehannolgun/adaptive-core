import type { ExerciseMedia } from "../types";

export type RepDbFlatImages = {
  main?: string;
  start?: string;
  peak?: string;
};

export type RepDbExerciseRecord = {
  id: string;
  images: {
    flat: RepDbFlatImages;
  };
};

export type RepDbSelectedRecordsSnapshot = {
  source: {
    repository: string;
    commit: string;
    acquiredAt: string;
  };
  records: RepDbExerciseRecord[];
};

export type RepDbDownloadedMediaFile = {
  localPath: string;
  checksum: string;
};

export type RepDbMediaManifest = Readonly<
  Record<string, RepDbDownloadedMediaFile>
>;

export type RepDbMediaMapIssue =
  | "INVALID_IMAGE_SHAPE"
  | "PREMIUM_MEDIA_NOT_ALLOWED"
  | "MISSING_MEDIA_MANIFEST_ENTRY"
  | "MISSING_MEDIA_LOCAL_PATH"
  | "MISSING_MEDIA_CHECKSUM";

export type RepDbMediaMapResult =
  | {
      ok: true;
      media: ExerciseMedia;
    }
  | {
      ok: false;
      issues: RepDbMediaMapIssue[];
    };

export type RepDbMediaCatalogFailure = {
  exerciseId: string;
  issues: RepDbMediaMapIssue[];
};

export type RepDbMediaCatalogResult =
  | {
      ok: true;
      media: ExerciseMedia[];
    }
  | {
      ok: false;
      failures: RepDbMediaCatalogFailure[];
    };
