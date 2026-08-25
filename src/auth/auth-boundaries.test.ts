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

function readRuntimeSources(): SourceFile[] {
  const namedFiles = ["App.tsx", "index.ts"]
    .map((path) => join(projectRoot, path))
    .filter(existsSync);
  const sourceFiles = sourceFilesIn(join(projectRoot, "src")).filter(
    (path) => !/\.test\.(ts|tsx)$/.test(path),
  );

  return [...new Set([...namedFiles, ...sourceFiles])]
    .sort()
    .map((path) => ({
      path: relative(projectRoot, path),
      content: readFileSync(path, "utf8"),
    }));
}

const supabaseImport = /from\s*["']@supabase\/supabase-js["']/;
const secureStoreImport =
  /import\s*\*\s*as\s+\w+\s+from\s*["']expo-secure-store["']/;
const databaseClientImport =
  /from\s*["'](?:(?:\.\.\/|\.\/)+|@\/|src\/)?database\/supabase-client["']/;

function filesMatching(files: SourceFile[], expression: RegExp): string[] {
  return files
    .filter(({ content }) => expression.test(content))
    .map(({ path }) => path)
    .sort();
}

describe("mobile auth source boundaries", () => {
  const runtimeSources = readRuntimeSources();

  it("keeps privileged credentials and JWT literals out of mobile source", () => {
    const forbiddenServiceRole = ["service", "role"].join("_");
    const forbiddenServiceRoleKey = ["SERVICE", "ROLE", "KEY"].join("_");
    const jwtLiteral = new RegExp(
      ["eyJ", "[A-Za-z0-9_-]+", "\\.", "eyJ", "[A-Za-z0-9_-]+"].join(""),
    );

    for (const source of runtimeSources) {
      expect(source.content).not.toContain(forbiddenServiceRole);
      expect(source.content).not.toContain(forbiddenServiceRoleKey);
      expect(source.content).not.toMatch(jwtLiteral);
    }
  });

  it("permits direct Supabase SDK imports only in the database and auth adapters", () => {
    expect(filesMatching(runtimeSources, supabaseImport)).toEqual([
      "src/auth/supabase-auth-adapter.ts",
      "src/database/supabase-client.ts",
    ]);
  });

  it("creates the Supabase client only in the database client module", () => {
    const clientFactoryImport =
      /import\s*\{[^}]*\bcreateClient\b[^}]*\}\s*from\s*["']@supabase\/supabase-js["']/s;

    expect(filesMatching(runtimeSources, clientFactoryImport)).toEqual([
      "src/database/supabase-client.ts",
    ]);
  });

  it("reads secure storage only in the secure session adapter", () => {
    expect(filesMatching(runtimeSources, secureStoreImport)).toEqual([
      "src/auth/secure-session-storage.ts",
    ]);
  });

  it("permits database composition only in the default identity service", () => {
    expect(filesMatching(runtimeSources, databaseClientImport)).toEqual([
      "src/auth/default-identity-service.ts",
    ]);
  });

  it("recognizes relative and alias database client import spellings", () => {
    for (const specifier of [
      "../database/supabase-client",
      "../../database/supabase-client",
      "@/database/supabase-client",
      "src/database/supabase-client",
    ]) {
      expect(`import client from \"${specifier}\";`).toMatch(
        databaseClientImport,
      );
    }
  });
});
