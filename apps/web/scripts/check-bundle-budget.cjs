#!/usr/bin/env node

/**
 * check-bundle-budget.cjs
 *
 * Reads the Next.js build manifest and checks that no page's JS bundle
 * exceeds the configured budget.  Run after `npm run build`.
 *
 * Usage:  node scripts/check-bundle-budget.cjs [--max-page-kb 300]
 *
 * Exit code 1 when any page exceeds the budget → blocks CI.
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = process.env.NEXT_BUILD_DIR || '.next-build';
const DEFAULT_MAX_PAGE_KB = 300;

const maxPageKbArg = process.argv.indexOf('--max-page-kb');
const MAX_PAGE_KB =
  maxPageKbArg !== -1 && process.argv[maxPageKbArg + 1]
    ? Number(process.argv[maxPageKbArg + 1])
    : DEFAULT_MAX_PAGE_KB;

const manifestPath = path.join(__dirname, '..', BUILD_DIR, 'build-manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`Build manifest not found at ${manifestPath}.\nRun "npm run build" first.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const pages = manifest.pages || {};
const buildDir = path.join(__dirname, '..', BUILD_DIR);

let hasViolation = false;

for (const [page, assets] of Object.entries(pages)) {
  let totalBytes = 0;

  for (const asset of assets) {
    if (!asset.endsWith('.js')) continue;
    const filePath = path.join(buildDir, asset);
    if (fs.existsSync(filePath)) {
      totalBytes += fs.statSync(filePath).size;
    }
  }

  const totalKb = totalBytes / 1024;

  if (totalKb > MAX_PAGE_KB) {
    console.error(
      `  OVER BUDGET  ${page}: ${totalKb.toFixed(1)} KB (max ${MAX_PAGE_KB} KB)`,
    );
    hasViolation = true;
  }
}

if (hasViolation) {
  console.error(
    '\nBundle budget exceeded. Split large pages with dynamic imports or move logic to shared chunks.',
  );
  process.exit(1);
} else {
  console.log(`All pages within budget (max ${MAX_PAGE_KB} KB per page).`);
}
