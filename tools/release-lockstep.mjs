import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Both grammar packages release together under one vMAJOR.MINOR.PATCH tag, but
// release-plz decides each package's next version on its own. This script
// takes the higher of the two Cargo versions and writes it everywhere a
// version lives, so the tag, both crates, both npm packages, and the generated
// parsers all agree.

const GRAMMARS = ['dataweave', 'raml'];
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseVersion(version) {
  const match = SEMVER.exec(version ?? '');
  assert(match, `Expected a stable MAJOR.MINOR.PATCH version, got ${version}`);
  return match.slice(1).map(Number);
}

export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

export function higherVersion(versions) {
  assert(versions.length > 0, 'Expected at least one version');
  return versions.reduce((best, next) => (compareVersions(next, best) > 0 ? next : best));
}

export function cargoPackageVersion(manifest) {
  const section = manifest.split(/^\[package\]\s*$/m)[1]?.split(/^\[/m)[0];
  const version = section?.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1];
  assert(version, 'Cargo.toml has no [package] version');
  return version;
}

export function setCargoPackageVersion(manifest, version) {
  const start = manifest.search(/^\[package\]\s*$/m);
  assert(start !== -1, 'Cargo.toml has no [package] table');
  const afterHeader = manifest.indexOf('\n', start) + 1;
  const next = manifest.slice(afterHeader).search(/^\[/m);
  const end = next === -1 ? manifest.length : afterHeader + next;
  const section = manifest.slice(afterHeader, end);
  assert(/^version\s*=\s*"[^"]+"/m.test(section), 'Cargo.toml [package] has no version');
  const updated = section.replace(/^(version\s*=\s*)"[^"]+"/m, `$1"${version}"`);
  return manifest.slice(0, afterHeader) + updated + manifest.slice(end);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

export function applyVersion(version, root = '.') {
  const at = (path) => `${root}/${path}`;
  for (const grammar of GRAMMARS) {
    const cargo = at(`${grammar}/Cargo.toml`);
    writeFileSync(cargo, setCargoPackageVersion(readFileSync(cargo, 'utf8'), version));
    const pkg = readJson(at(`${grammar}/package.json`));
    pkg.version = version;
    writeJson(at(`${grammar}/package.json`), pkg);
    const sitter = readJson(at(`${grammar}/tree-sitter.json`));
    sitter.metadata.version = version;
    writeJson(at(`${grammar}/tree-sitter.json`), sitter);
  }
  // The private workspace root carries the same version for consistency.
  if (existsSync(at('package.json'))) {
    const pkg = readJson(at('package.json'));
    pkg.version = version;
    writeJson(at('package.json'), pkg);
  }
  if (existsSync(at('tree-sitter.json'))) {
    const sitter = readJson(at('tree-sitter.json'));
    sitter.metadata.version = version;
    writeJson(at('tree-sitter.json'), sitter);
  }
}

export function lockstep(root = '.') {
  const versions = GRAMMARS.map((grammar) =>
    cargoPackageVersion(readFileSync(`${root}/${grammar}/Cargo.toml`, 'utf8')),
  );
  const version = higherVersion(versions);
  applyVersion(version, root);
  return version;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(lockstep());
}
