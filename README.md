# tree-sitter-mulesoft

Tree-sitter grammars for MuleSoft integration file formats:
- **DataWeave** (`.dwl`) — Transformation and mapping language (`tree-sitter-dataweave`).
- **RAML** (`.raml`) — RESTful API Modeling Language specification format (`tree-sitter-raml`).

## Architecture

This repository holds two independent tree-sitter grammars:

| Grammar | Subdirectory | C Symbol | NPM Package | Rust Crate |
|---|---|---|---|---|
| DataWeave | `dataweave/` | `tree_sitter_dataweave` | `tree-sitter-dataweave` | `tree-sitter-dataweave` |
| RAML | `raml/` | `tree_sitter_raml` | `tree-sitter-raml` | `tree-sitter-raml` |

## Usage

### Rust

Add the respective grammar crate to your `Cargo.toml`:

```toml
[dependencies]
tree-sitter-dataweave = "0.1"
tree-sitter-raml = "0.1"
```

```rust
use tree_sitter::Parser;

let mut parser = Parser::new();
parser.set_language(&tree_sitter_dataweave::LANGUAGE.into())?;
let tree = parser.parse("%dw 2.0\noutput application/json\n---\n{ key: 'value' }", None)?;
```

### Node.js

Install the packages:

```bash
npm install tree-sitter-dataweave tree-sitter-raml
```

```javascript
import Parser from "tree-sitter";
import DataWeave from "tree-sitter-dataweave";

const parser = new Parser();
parser.setLanguage(DataWeave);
```

## Releases

The `Release` workflow publishes both grammar crates to crates.io, both unscoped
packages to npmjs, and `@meloncholera/tree-sitter-dataweave` and
`@meloncholera/tree-sitter-raml` to GitHub Packages. The workspace root remains private.

Push an existing release commit as a `vMAJOR.MINOR.PATCH` tag, or run the workflow
manually with an existing tag. Both grammar Cargo manifests must match the tag's
version. npm versions are set from the tag in the publishing checkouts only.
The workflow verifies generated parsers, corpus tests, fixtures, Rust packages,
and Node bindings before any publishing job starts. Each registry skips versions
already published, and the GitHub Release is created after all packages succeed.

GitHub Actions requires the repository secrets `CARGO_REGISTRY_TOKEN` and
`NPM_TOKEN`; GitHub Packages uses the workflow's `GITHUB_TOKEN`. npm packages ship
the generated C parsers and build their native bindings during installation.

## License

MIT (see [LICENSE](LICENSE) and [NOTICE](NOTICE)).
