import assert from 'node:assert';
import { test } from 'node:test';
import Parser from 'tree-sitter';

test('can load grammar and parse a document', async () => {
  const parser = new Parser();
  const { default: language } = await import('./index.js');
  parser.setLanguage(language);
  const tree = parser.parse('%dw 2.0\noutput application/json\n---\n{ message: "hello" }');
  assert.equal(tree.rootNode.hasError, false);
  assert.ok(Array.isArray(language.nodeTypeInfo));
  assert.ok(language.nodeTypeInfo.some((node) => node.named && node.type === tree.rootNode.type));
  assert.ok(language.HIGHLIGHTS_QUERY.length > 0);
  assert.doesNotThrow(() => new Parser.Query(language, language.HIGHLIGHTS_QUERY));
});

test('exports the dataweave language name', async () => {
  const { default: language } = await import('./index.js');
  assert.equal(language.name, 'dataweave');
});
