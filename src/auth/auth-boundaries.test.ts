/// <reference types="node" />

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

type SourceFile = {
  path: string;
  content: string;
};

const projectRoot = process.cwd();

function sourceFilesIn(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(path, entry.name);

    if (entry.isDirectory()) {
      return sourceFilesIn(entryPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function readMobileSources(): SourceFile[] {
  const namedFiles = ["App.tsx", "index.ts", "src/database/supabase-client.ts"]
    .map((path) => join(projectRoot, path))
    .filter(existsSync);
  const directoryFiles = ["src/auth", "src/config", "src/engine", "src/features"]
    .flatMap((path) => sourceFilesIn(join(projectRoot, path)));

  return [...new Set([...namedFiles, ...directoryFiles])]
    .sort()
    .map((path) => ({
      path: relative(projectRoot, path),
      content: readFileSync(path, "utf8"),
    }));
}

function filesMatching(files: SourceFile[], expression: RegExp): string[] {
  return files
    .filter(({ content }) => expression.test(content))
    .map(({ path }) => path)
    .sort();
}

describe("mobile auth source boundaries", () => {
  const mobileSources = readMobileSources();

  it("keeps privileged credentials and JWT literals out of mobile source", () => {
    const forbiddenServiceRole = ["service", "role"].join("_");
    const forbiddenServiceRoleKey = ["SERVICE", "ROLE", "KEY"].join("_");
    const jwtLiteral = new RegExp(
      ["eyJ", "[A-Za-z0-9_-]+", "\\.", "eyJ", "[A-Za-z0-9_-]+"].join(""),
    );

    for (const source of mobileSources) {
      expect(source.content).not.toContain(forbiddenServiceRole);
      expect(source.content).not.toContain(forbiddenServiceRoleKey);
      expect(source.content).not.toMatch(jwtLiteral);
    }
  });

  it("keeps Supabase and secure session imports outside engine and features", () => {
    const prohibitedImport =
      /from\s*["'](?:@supabase\/supabase-js|expo-secure-store|\.\.\/database\/supabase-client)["']/;
    const productSources = mobileSources.filter(
      ({ path }) => path.startsWith("src/engine/") || path.startsWith("src/features/"),
    );

    for (const source of productSources) {
      expect(source.content).not.toMatch(prohibitedImport);
    }
  });

  it("creates the Supabase client only in the database client module", () => {
    const clientFactoryImport =
      /import\s*\{[^}]*\bcreateClient\b[^}]*\}\s*from\s*["']@supabase\/supabase-js["']/s;

    expect(filesMatching(mobileSources, clientFactoryImport)).toEqual([
      "src/database/supabase-client.ts",
    ]);
  });

  it("reads secure storage only in the secure session adapter", () => {
    const secureStoreImport =
      /import\s*\*\s*as\s+\w+\s+from\s*["']expo-secure-store["']/;

    expect(filesMatching(mobileSources, secureStoreImport)).toEqual([
      "src/auth/secure-session-storage.ts",
    ]);
  });
});
