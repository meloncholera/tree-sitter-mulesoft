import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import loadBinding from 'node-gyp-build';

const root = fileURLToPath(new URL('../..', import.meta.url));

const binding = loadBinding(root);

binding.nodeTypeInfo = JSON.parse(
  readFileSync(new URL('../../src/node-types.json', import.meta.url), 'utf8'),
);

const queries = [
  ['HIGHLIGHTS_QUERY', `${root}/queries/highlights.scm`],
  ['INJECTIONS_QUERY', `${root}/queries/injections.scm`],
  ['LOCALS_QUERY', `${root}/queries/locals.scm`],
  ['TAGS_QUERY', `${root}/queries/tags.scm`],
];

for (const [prop, path] of queries) {
  Object.defineProperty(binding, prop, {
    configurable: true,
    enumerable: true,
    get() {
      delete binding[prop];
      try {
        binding[prop] = readFileSync(path, 'utf8');
      } catch {
        // The query file is optional; leave the property undefined when it is absent.
      }
      return binding[prop];
    },
  });
}

export default binding;
