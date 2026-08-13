import type { ImageSourcePropType } from "react-native";
import {
  REPDB_ASSETS,
  type RepDbAssetPath,
} from "./generated/repdb-assets";

export function resolveRepDbAsset(
  localPath: string,
): ImageSourcePropType | null {
  if (!isRepDbAssetPath(localPath)) {
    return null;
  }

  return REPDB_ASSETS[localPath];
}

function isRepDbAssetPath(localPath: string): localPath is RepDbAssetPath {
  return Object.prototype.hasOwnProperty.call(REPDB_ASSETS, localPath);
}
