# monaco-editor-impl

Sample minimal 'vscode-like` workspace implementation using [monaco](https://microsoft.github.io/monaco-editor/).

Core components/dependencies:

- [`lit`](https://lit.dev/)
- [`monaco`](https://github.com/microsoft/monaco-editor)
- [`shoelace`](https://shoelace.style/)

## Demo

[https://bryjen.github.io/monaco-editor-impl/](https://bryjen.github.io/monaco-editor-impl/)

Pressing `ctrl+enter` in the editor component triggers a sample test execution flow.

## Building & Running

```shell
git clone https://github.com/bryjen/monaco-editor-impl.git
cd monaco-editor-impl
bun install
bun run build  # or `bun run build:watch` to watch for file changes
```

Executing above will place build artifacts to `./out`, which can then be served (ex. using vercel's [serve](https://www.npmjs.com/package/serve) tool).
