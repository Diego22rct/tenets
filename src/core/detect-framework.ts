import fs from 'node:fs';
import path from 'node:path';
import type { ClassFact, ExportFact, Framework, FunctionFact, ImportFact } from './types.js';

export interface ProjectFrameworkDetection {
  primary: Framework | 'unspecialized';
  frameworks: Framework[];
  isSpecialized: boolean;
  displayName: string;
}

export const FRAMEWORK_NAMES: Record<Framework, string> = {
  hono: 'Hono',
  nextjs: 'Next.js',
  angular: 'Angular',
  nestjs: 'NestJS',
};

export interface FactsForDetection {
  importFacts: ImportFact[];
  functionFacts: FunctionFact[];
  classFacts: ClassFact[];
  exportFacts: ExportFact[];
}

export function detectProjectFrameworks(
  rootPath: string,
  facts?: FactsForDetection,
): ProjectFrameworkDetection {
  const detected = new Set<Framework>();

  // 1. Inspect package.json if present
  const pkg = loadNearestPackageJson(rootPath);
  if (pkg) {
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
    };

    if (allDeps['hono'] || allDeps['@hono/node-server'] || allDeps['@hono/zod-openapi']) {
      detected.add('hono');
    }
    if (allDeps['next']) {
      detected.add('nextjs');
    }
    if (allDeps['@angular/core']) {
      detected.add('angular');
    }
    if (allDeps['@nestjs/core'] || allDeps['@nestjs/common']) {
      detected.add('nestjs');
    }
  }

  // 2. Inspect parsed facts if available
  if (facts) {
    for (const imp of facts.importFacts) {
      if (imp.source === 'hono' || imp.source.startsWith('hono/') || imp.source.startsWith('@hono/')) {
        detected.add('hono');
      } else if (imp.source === 'next' || imp.source.startsWith('next/')) {
        detected.add('nextjs');
      } else if (imp.source === '@angular/core' || imp.source.startsWith('@angular/')) {
        detected.add('angular');
      } else if (imp.source === '@nestjs/core' || imp.source.startsWith('@nestjs/')) {
        detected.add('nestjs');
      }
    }

    if (detected.size === 0) {
      const highConfidenceRoles = [
        ...facts.functionFacts.filter((f: FunctionFact) => f.frameworkRole?.confidence === 'high').map((f: FunctionFact) => f.frameworkRole?.framework),
        ...facts.classFacts.filter((c: ClassFact) => c.frameworkRole?.confidence === 'high').map((c: ClassFact) => c.frameworkRole?.framework),
        ...facts.exportFacts.filter((e: ExportFact) => e.frameworkRole?.confidence === 'high').map((e: ExportFact) => e.frameworkRole?.framework),
      ];

      for (const fw of highConfidenceRoles) {
        if (fw) detected.add(fw);
      }
    }
  }

  const frameworks = Array.from(detected);
  if (frameworks.length === 0) {
    return {
      primary: 'unspecialized',
      frameworks: [],
      isSpecialized: false,
      displayName: 'none',
    };
  }

  return {
    primary: frameworks[0]!,
    frameworks,
    isSpecialized: true,
    displayName: frameworks.map((f) => FRAMEWORK_NAMES[f]).join(', '),
  };
}

function loadNearestPackageJson(startPath: string): Record<string, any> | null {
  try {
    const resolved = path.resolve(startPath);
    let currentDir = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);

    for (let i = 0; i < 6; i++) {
      const candidate = path.join(currentDir, 'package.json');
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf8');
        return JSON.parse(raw);
      }
      const parent = path.dirname(currentDir);
      if (parent === currentDir) break;
      currentDir = parent;
    }
  } catch {
    // Ignore read/parse errors
  }
  return null;
}
