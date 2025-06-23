import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CodeEditorController, File } from "./controller";

import { parsePath } from "./utils/path";

import { Settings, Copy, Ellipsis, X } from 'lucide';
import { createIcon, createIconWithDim } from "./utils/lucide";

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';

import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/popup/popup.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';


@customElement("editor-toolbar")
export class Toolbar extends LitElement {

    static override styles = [
        css`
            .toolbar {
                display: flex;
                align-items: center;


                height: 30px;
                background: #252526;
                color: #cccccc;
            }

            .toolbar > #options-container {
                display: flex;
                align-items: center;
                gap: 0.5rem;

                padding: 0 1rem;
                border-bottom: 1px solid #3e3e42;
                box-sizing: border-box;

                height: 100%;
            }

            #tabs-container {
                flex-grow: 1;
                height: 100%;

                display: flex;
                flex-direction: row;
            }

            p {
                margin: 0 !important;
                user-select: none;
            }

            .tab {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 4px;

                border: 1px solid #3e3e42;
                width: fit-content;
                height: 100%;
                padding: 0 0.75rem;
                box-sizing: border-box;

                font-size: var(--sl-font-size-x-small);
                font-family: var(--sl-font-sans);

                cursor: pointer;
            }

            .tab:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .tab:hover .close-icon {
                visibility: visible !important;
            }

            .tab:active {
                background: rgba(255, 255, 255, 0.15);
            }



            .tab.tab-current {
                border-top: 1.5px solid #679ad1;
                border-bottom: none;
                background-color: #1e1e1e;

                font-weight: var(--sl-font-weight-bold);
            }

            .tab .close-icon {
                display: flex;
                align-items: center;
                padding: 2px;
                border-radius: 4px;
            }

            .tab .close-icon:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .tab .close-icon:active {
                background: rgba(255, 255, 255, 0.15);
            }


            .toolbar-button {
                display: flex;
                align-items: center;

                padding: 6px;
                border-radius: 6px;
            }

            .toolbar-button:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .menu-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: var(--sl-font-size-small);
            }

            #toolbar-filler {
                flex: 1;
                border-bottom: 1px solid #3e3e42;
            }
        `,

        // settings styling
        css`
        .settings-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .settings-block {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 20px;
        }
        `
    ]

    // @ts-ignore
    @property({attribute: false})
    controller!: CodeEditorController;

    private initialized = false;

    protected override willUpdate(changedProperties: PropertyValues) {
        if (changedProperties.has('controller') && this.controller && !this.initialized) {
            this.controller.addHost(this);
            this.initialized = true;
        }
    }

    protected override render(): TemplateResult {
        const { files, currentFileHash } = this.controller.getOpenFiles()
        return html`
            <div class="toolbar">
                <div id="options-container">
                    ${this.renderExplorerToggleButton()}
                    ${this.renderMoreActionsButton()}
                    ${this.renderSettingsButton()}
                </div>
                <div id="tabs-container">
                    ${files.map(file => this.renderTab(file, file.hash() === currentFileHash))}
                    <div id="toolbar-filler"></div>
                </div>
            </div>
        `
    }

    private renderTab(file: File, isCurrent: boolean): TemplateResult {
        const handleCloseClick = (e: Event) => {
            e.stopPropagation();
            this.controller.closeFile(file.hash());
        };


        let classes = [ 'tab' ]
        if (isCurrent) {
            classes.push('tab-current')
        }

        const baseName = parsePath(file.path).base
        return html`
            <div class="${classes.join(' ')}" 
                 @click=${() => this.controller.setCurrentFile(file.hash())}>

                <p>
                    ${baseName}
                </p>
                <div class="close-icon" 
                     style="${isCurrent ? '' : 'visibility: hidden'}"
                     @click=${handleCloseClick}>
                    ${createIconWithDim(X, 16)}
                </div>
            </div>
        `
    }

    private renderExplorerToggleButton(): TemplateResult {
        const toggleExplorer = () => {
            this.controller.toggleExplorer();

            const editorToolbars = document.querySelectorAll('editor-toolbar');

            editorToolbars.forEach(toolbar => {
                if (toolbar.shadowRoot) {
                    const tooltips = toolbar.shadowRoot.querySelectorAll('sl-tooltip');
                    tooltips.forEach(tooltip => tooltip.hide());
                }
            });
        };

        return html`
            <div @click=${toggleExplorer}>
                <div class="toolbar-button">
                    ${createIcon(Copy)}
                </div>
            </div>
        `
    }

    private renderMoreActionsButton(): TemplateResult {
        return html`
            <sl-dropdown>
                <div slot="trigger">
                    <div class="toolbar-button">
                        ${createIcon(Ellipsis)}
                    </div>
                </div>
                <sl-menu>
                    <sl-menu-item>
                        <div class="menu-item">
                            Close all tabs
                        </div>
                    </sl-menu-item>
                </sl-menu>
            </sl-dropdown>           
        `
    }

    private renderSettingsButton(): TemplateResult {
        const showDialog = () => {
            const dialog = this.renderRoot.querySelector('.dialog-overview') as any;
            dialog?.show();
        };

        const hideDialog = () => {
            const dialog = this.renderRoot.querySelector('.dialog-overview') as any;
            dialog?.hide();
        };

        const handleRequestClose = (event: CustomEvent) => {
            if (event.detail.source === 'overlay') {
                event.preventDefault();
            }
        };

        return html`
            <sl-dialog 
                    label="Settings" 
                    class="dialog-overview"
                    @sl-request-close=${handleRequestClose}
                    style="--width: 50vw;"
            >
                <div class="settings-container">
                    <sl-checkbox size="small" help-text="Provides limited intellisense functionality for each language.">
                        Code Suggestions
                    </sl-checkbox>

                    <sl-checkbox size="small" help-text="Provides high-level overview of your source code, which is useful for quick navigation and code understanding.">
                        Code Minimap
                    </sl-checkbox>

                    <div class="settings-block">
                        <div style="display: flex; align-items: center">
                            Keymap:
                        </div>
                        <sl-select value="normal" size="small" strategy="fixed">
                            <sl-option value="normal">normal</sl-option>
                            <sl-option value="vim">vim</sl-option>
                        </sl-select>
                    </div>

                </div>

                <sl-button slot="footer" size="small" variant="default" @click=${hideDialog}>
                    Back
                </sl-button>
                <sl-button slot="footer" size="small" variant="primary" @click=${hideDialog}>
                    Save
                </sl-button>
            </sl-dialog>

            <div slot="trigger" @click=${showDialog}>
                <div class="toolbar-button">
                    ${createIcon(Settings)}
                </div>
            </div>
        `;
    }
}