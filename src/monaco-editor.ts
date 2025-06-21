import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

// @ts-ignore
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js'; 
// @ts-ignore
import { initVimMode } from 'monaco-vim';
import type { CodeEditorController, File } from "./controller";

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

    // @ts-ignore
    @property({attribute: false})
    controller!: CodeEditorController;

    private _initialized = false;
    private _editor!: monaco.editor.IStandaloneCodeEditor;

    protected override willUpdate(changedProperties: PropertyValues) {
        if (changedProperties.has('controller') && this.controller && !this._initialized) {
            this.controller.addHost(this);
            this._initialized = true;
        }
    }


    // we disable the shadow DOM for monaco
    protected override createRenderRoot() {
        return this;
    }

    protected override render(): TemplateResult {
        return html`
            <style>
                #monaco-editor-container {
                    height: 100%;
                    background: var(--editor-bg, white);
                }
            </style>
            <div id="monaco-editor-container"></div>
        `
    }

    protected override firstUpdated(_changedProperties: PropertyValues): void {
        const { files, currentFileHash } = this.controller.getOpenFiles();
        const currentFile = currentFileHash ? files.find(file => file.hash() === currentFileHash) : null;
        const value = currentFile?.contents ?? '';

        this._editor = monaco.editor.create(this.querySelector('#monaco-editor-container'), {
            value: value,
            language: 'cpp',
            theme: 'vs-dark',
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

        this._editor.onKeyDown((e: monaco.IKeyboardEvent) => {
            // console.log('Key pressed:', e.keyCode, e.code);
            if (e.ctrlKey && e.keyCode === monaco.KeyCode.Enter) {
                e.preventDefault();
                console.log('Ctrl+Enter - Run code request');
            }
        });

        const vimMode = initVimMode(this._editor, document.getElementById('vim-status'));
    }
}