import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  cargoPackageVersion,
  compareVersions,
  higherVersion,
  lockstep,
  setCargoPackageVersion,
} from './release-lockstep.mjs';

const cargo = (name, version) =>
  `[package]\nname = "${name}"\nversion = "${version}"\nedition = "2024"\n\n[dependencies]\nfoo = { version = "1.2.3" }\n`;

test('compareVersions orders numerically, not lexically', () => {
  assert(compareVersions('0.10.0', '0.9.0') > 0);
  assert(compareVersions('1.0.0', '0.99.99') > 0);
  assert.equal(compareVersions('0.1.1', '0.1.1'), 0);
});

test('higherVersion picks the largest and rejects non-release versions', () => {
  assert.equal(higherVersion(['0.1.1', '0.2.0', '0.1.9']), '0.2.0');
  assert.throws(() => higherVersion(['0.1.1', '0.2.0-rc.1']));
});

test('cargo version helpers only touch the package version', () => {
  const manifest = cargo('tree-sitter-raml', '0.1.1');
  assert.equal(cargoPackageVersion(manifest), '0.1.1');
  const updated = setCargoPackageVersion(manifest, '0.2.0');
  assert.equal(cargoPackageVersion(updated), '0.2.0');
  assert(updated.includes('foo = { version = "1.2.3" }'));
});

test('lockstep writes the higher version to every manifest', () => {
  const root = mkdtempSync(join(tmpdir(), 'lockstep-'));
  try {
    const write = (path, content) => writeFileSync(join(root, path), content);
    mkdirSync(join(root, 'dataweave'));
    mkdirSync(join(root, 'raml'));
    write('dataweave/Cargo.toml', cargo('tree-sitter-dataweave', '0.2.0'));
    write('raml/Cargo.toml', cargo('tree-sitter-raml', '0.1.1'));
    for (const grammar of ['dataweave', 'raml']) {
      write(`${grammar}/package.json`, JSON.stringify({ name: grammar, version: '0.1.1' }));
      write(`${grammar}/tree-sitter.json`, JSON.stringify({ metadata: { version: '0.1.1' } }));
    }
    write('package.json', JSON.stringify({ name: 'root', version: '0.1.1' }));
    write('tree-sitter.json', JSON.stringify({ metadata: { version: '0.1.1' } }));

    assert.equal(lockstep(root), '0.2.0');

    for (const grammar of ['dataweave', 'raml']) {
      assert.equal(
        cargoPackageVersion(readFileSync(join(root, grammar, 'Cargo.toml'), 'utf8')),
        '0.2.0',
      );
      assert.equal(JSON.parse(readFileSync(join(root, grammar, 'package.json'))).version, '0.2.0');
      assert.equal(
        JSON.parse(readFileSync(join(root, grammar, 'tree-sitter.json'))).metadata.version,
        '0.2.0',
      );
    }
    assert.equal(JSON.parse(readFileSync(join(root, 'package.json'))).version, '0.2.0');
    assert.equal(
      JSON.parse(readFileSync(join(root, 'tree-sitter.json'))).metadata.version,
      '0.2.0',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
