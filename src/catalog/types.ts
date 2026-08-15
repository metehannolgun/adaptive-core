export type SupportedLocale = "en" | "tr";

export type CatalogStatus =
  | "draft"
  | "reviewed"
  | "active"
  | "retired";

export type MovementPattern =
  | "trunk_flexion"
  | "anti_extension"
  | "anti_rotation"
  | "rotation"
  | "lateral_stability"
  | "hip_control";

export type UserFocusLabel =
  | "upper_abs"
  | "lower_abs"
  | "obliques"
  | "deep_core"
  | "stability";

export type LoadMode =
  | "reps"
  | "seconds"
  | "alternating_reps"
  | "tempo_reps";

export type ExerciseLevel = 1 | 2 | 3 | 4 | 5;
export type DemandLevel = 1 | 2 | 3 | 4 | 5;
export type EquipmentTag = "bodyweight";

export type Exercise = {
  id: string;
  slug: string;
  status: CatalogStatus;
  primaryPattern: MovementPattern;
  secondaryPatterns: MovementPattern[];
  userFocusLabels: UserFocusLabel[];
  loadMode: LoadMode;
  level: ExerciseLevel;
  strengthDemand: DemandLevel;
  coordinationDemand: DemandLevel;
  fatigueScore: DemandLevel;
  equipment: EquipmentTag[];
  minLoad: number;
  defaultLoad: number;
  maxLoad: number;
  loadStep: number;
  estimatedSecondsPerUnit: number;
  defaultSets: number;
  minRestSeconds: number;
  maxRestSeconds: number;
  setupSeconds: number;
  bilateral: boolean;
  contraindicationTags: string[];
  mediaId: string;
  metadataVersion: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type ExerciseContent = {
  exerciseId: string;
  locale: SupportedLocale;
  name: string;
  setupInstruction: string;
  cues: string[];
  breathingCue: string;
  commonMistakes: string[];
  stopConditions: string[];
  altText: string;
  contentVersion: number;
  status: CatalogStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type MediaType = "gif" | "svg" | "lottie" | "webp";

export type MediaApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";

export type MediaModification =
  | "resize"
  | "crop"
  | "recolor"
  | "upscale"
  | "background_remove"
  | "generative_derivation";

export type MediaFile = {
  localPath: string;
  sourcePath: string;
  checksum: string;
};

export type ExerciseMediaPresentation =
  | {
      kind: "single";
      main: MediaFile;
      fallbackRole: "main";
    }
  | {
      kind: "start_peak";
      start: MediaFile;
      peak: MediaFile;
      fallbackRole: "start" | "peak";
    };

export type ExerciseMedia = {
  id: string;
  exerciseId: string;
  type: MediaType;
  presentation: ExerciseMediaPresentation;
  sourceUrl: string;
  creator: string;
  licenseId: string;
  licenseUrl: string;
  commercialUseAllowed: boolean;
  allowedModifications: MediaModification[];
  appliedModifications: MediaModification[];
  attributionRequired: boolean;
  attributionText: string | null;
  attributionUrl: string | null;
  acquiredAt: string;
  approvalStatus: MediaApprovalStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type CatalogEntry = {
  exercise: Exercise;
  contents: ExerciseContent[];
  media: ExerciseMedia;
};

export type CatalogSeed = {
  entries: CatalogEntry[];
  relations: ExerciseRelation[];
};

export type ExerciseRelationType =
  | "progression"
  | "regression"
  | "substitute";

export type ExerciseRelationStatus =
  | "draft"
  | "reviewed"
  | "active";

export type ExerciseRelation = {
  fromExerciseId: string;
  toExerciseId: string;
  type: ExerciseRelationType;
  reason: string;
  status: ExerciseRelationStatus;
  cycleApproved: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type CatalogValidationCode =
  | "DUPLICATE_EXERCISE_ID"
  | "DUPLICATE_EXERCISE_SLUG"
  | "DUPLICATE_MEDIA_ID"
  | "MISSING_RELATION_SOURCE"
  | "MISSING_RELATION_TARGET"
  | "MISSING_RELATION_REASON"
  | "SELF_REFERENCING_RELATION"
  | "MISSING_RELATION_REVIEW"
  | "RELATION_EXERCISE_NOT_FOUND"
  | "DUPLICATE_RELATION"
  | "UNAPPROVED_PROGRESSION_CYCLE"
  | "SUBSTITUTE_PATTERN_MISMATCH"
  | "SUBSTITUTE_DEMAND_INCREASE"
  | "EXERCISE_NOT_ACTIVE"
  | "CONTENT_NOT_ACTIVE"
  | "MISSING_CONTENT_REVIEW"
  | "CONTENT_EXERCISE_MISMATCH"
  | "MEDIA_EXERCISE_MISMATCH"
  | "MEDIA_REFERENCE_MISMATCH"
  | "MISSING_EXERCISE_ID"
  | "MISSING_EXERCISE_SLUG"
  | "MISSING_EXERCISE_MEDIA"
  | "INVALID_LOAD_RANGE"
  | "INVALID_LOAD_STEP"
  | "INVALID_ESTIMATED_SECONDS_PER_UNIT"
  | "INVALID_DEFAULT_SETS"
  | "INVALID_REST_RANGE"
  | "INVALID_SETUP_SECONDS"
  | "INVALID_METADATA_VERSION"
  | "MISSING_EXERCISE_REVIEW"
  | "MISSING_EN_CONTENT"
  | "MISSING_TR_CONTENT"
  | "DUPLICATE_EN_CONTENT"
  | "DUPLICATE_TR_CONTENT"
  | "MISSING_NAME"
  | "MISSING_SETUP_INSTRUCTION"
  | "MISSING_CUE"
  | "TOO_MANY_CUES"
  | "MISSING_BREATHING_CUE"
  | "MISSING_COMMON_MISTAKE"
  | "MISSING_STOP_CONDITION"
  | "MISSING_ALT_TEXT"
  | "MISSING_MAIN_MEDIA"
  | "MISSING_START_MEDIA"
  | "MISSING_PEAK_MEDIA"
  | "MISSING_MEDIA_SOURCE_PATH"
  | "MISSING_MEDIA_SOURCE"
  | "MISSING_MEDIA_CREATOR"
  | "MISSING_LICENSE_ID"
  | "MISSING_LICENSE_URL"
  | "COMMERCIAL_USE_NOT_ALLOWED"
  | "UNLICENSED_MEDIA_MODIFICATION"
  | "MISSING_ATTRIBUTION_TEXT"
  | "MISSING_ATTRIBUTION_URL"
  | "MISSING_ACQUISITION_DATE"
  | "MISSING_MEDIA_CHECKSUM"
  | "MEDIA_NOT_APPROVED"
  | "MISSING_MEDIA_REVIEW";
