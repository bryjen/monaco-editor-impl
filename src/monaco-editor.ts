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

/**
 * Gets the appropriate monaco editor language string based on the file extension.
 */
function getLanguageFromFileExtension(ext: string) {
    const map = new Map<string, string>([
        // c
        ['c', 'c'],
        ['h', 'c'],
        // c++
        ['cpp', 'cpp'],
        ['hpp', 'cpp'],
    ]);
    return map.get(ext) ?? 'plaintext';
}

@customElement("monaco-editor")
export class Editor extends LitElement {

    // @ts-ignore
    @property({attribute: false})
    controller!: CodeEditorController;

    private _initialized = false;
    private _editor!: monaco.editor.IStandaloneCodeEditor;
    private _models = new Map<string, monaco.editor.ITextModel>();


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
        // initialize editor
        this._editor = monaco.editor.create(this.querySelector('#monaco-editor-container'), {
            value: '',
            language: 'plaintext',
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

        // initialize editor contents
        // deferred so we can use monaco's editor models to store content state
        const { files, currentFileHash } = this.controller.getOpenFiles();
        const currentFile = currentFileHash ? files.find(file => file.hash() === currentFileHash) : undefined;
        const value = currentFile?.contents ?? '';
        const language = getLanguageFromFileExtension(currentFile?.getExtension() ?? '');

        if (currentFile) {
            let model = this._models.get(currentFile.hash());
            if (!model) {
                model = monaco.editor.createModel(value, language);
                this._models.set(currentFile.hash(), model);
                this._editor.setModel(model);
            }
        }

        this._editor.onKeyDown((e: monaco.IKeyboardEvent) => {
            // console.log('Key pressed:', e.keyCode, e.code);
            if (e.ctrlKey && e.keyCode === monaco.KeyCode.Enter) {
                e.preventDefault();
                console.log('Ctrl+Enter - Run code request');
            }
        });

        const vimMode = initVimMode(this._editor, document.getElementById('vim-status'));
    }

    protected override update(changedProperties: PropertyValues) {
        super.update(changedProperties);
        
        // This runs on every reactive update cycle
        if (this._editor && this.controller) {
            const { files, currentFileHash } = this.controller.getOpenFiles();
            const currentFile = currentFileHash ? files.find(file => file.hash() === currentFileHash) : null;
            const language = getLanguageFromFileExtension(currentFile?.getExtension() ?? '');
            
            if (currentFile) {
                let model = this._models.get(currentFile.hash());

                if (!model) {
                    model = monaco.editor.createModel(currentFile.contents, language);
                    this._models.set(currentFile.hash(), model);
                }
                
                // Only switch if it's a different model
                if (this._editor.getModel() !== model) {
                    this._editor.setModel(model);
                }
            }
        }
    }
}