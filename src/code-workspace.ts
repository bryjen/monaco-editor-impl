import { html, LitElement, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";

export class CodeWorkspace extends LitElement {
    protected override createRenderRoot() {
        return this;
    }

    protected override render(): TemplateResult {
        return html`
            <style>
                #editor-container {
                    width: var(--editor-width, 800px);
                    height: var(--editor-height, 600px);
                    background: var(--editor-bg, white);

                    display: flex;
                    flex-direction: row;
                }

                #inside-editor-container {
                    width: 100%;
                    height: 100%;

                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
            </style>
            <div id="editor-container">
                <div id="explorer-container">
                    <p>File Container</p>
                </div>

                <div id="inside-editor-container">
                    <div>
                        <p>
                            HEADER
                        </p>
                    </div>

                    <!-- custom code editor -->
                    <monaco-editor></monaco-editor>

                    <div>
                        FOOTER
                    </div>
                </div>
            </div>
        `
    }
}