import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

// @ts-ignore
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js'; 
// @ts-ignore
import { initVimMode } from 'monaco-vim';


// for intellisense
declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl: (moduleId: string, label: string) => string;
    };
  }
}

// declare global worker
self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId: any, label: any) {
		if (label === 'json') {
			return './vs/language/json/json.worker.js';
		}
		if (label === 'css' || label === 'scss' || label === 'less') {
			return './vs/language/css/css.worker.js';
		}
		if (label === 'html' || label === 'handlebars' || label === 'razor') {
			return './vs/language/html/html.worker.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return './vs/language/typescript/ts.worker.js';
		}
		return './vs/editor/editor.worker.js';
	}
};


@customElement("monaco-editor")
export class Editor extends LitElement {

    @property()
    contents: string = '';

    @property()
    language: 'cpp' | 'java' | 'csharp' = 'cpp';

    // here, we disable the shadow DOM>
    // monaco relies heavily on it and it could cause problems down the line if we work around the 
    // shadow DOM instead.
    protected override createRenderRoot() {
        return this;
    }

    protected override render(): TemplateResult {
        return html`
            <style>
                #monaco-editor {
                    flex-grow: 1;
                    background: var(--editor-bg, white);
                }
            </style>
            <div id="monaco-editor"></div>
        `
    }

    protected override firstUpdated(_changedProperties: PropertyValues): void {
        const editor: monaco.editor.IStandaloneCodeEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
            value: [
                '#include <iostream>', 
                '#include <vector>',
                '', 
                'int main() {', 
                '    std::cout << "Hello, world!" << std::endl;',
                '    return 0;', 
                '}'
            ].join('\n'),
            language: 'cpp',
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            minimap: {
                enabled: false
            },
            folding: true,
            foldingStrategy: 'auto',
            foldingHighlight: true,
            showFoldingControl: 'mouseover',
            quickSuggestions: {
                other: true,
                comments: false,
                strings: false
            }
        });

        editor.onKeyDown((e: monaco.IKeyboardEvent) => {
            // console.log('Key pressed:', e.keyCode, e.code);
            if (e.ctrlKey && e.keyCode === monaco.KeyCode.Enter) {
                e.preventDefault();
                console.log('Ctrl+Enter - Run code request');
            }
        });

        const vimMode = initVimMode(editor, document.getElementById('vim-status'));
    }
}