import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CodeEditorController, File } from "./controller";

import { parsePath } from "./utils/path";

import { createElement, Settings, Copy, Ellipsis, X } from 'lucide';

function createIcon(iconFunction: any, attrs = {}) {
    return createElement(iconFunction, {
        width: 16,
        height: 16,
        'stroke-width': 2,
        ...attrs
    });
}

function createIconWithDim(iconFunction: any, dim: number, attrs = {}) {
    return createElement(iconFunction, {
        width: dim,
        height: dim,
        'stroke-width': 2,
        ...attrs
    });
}


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

    protected render(): TemplateResult {
        const { files, currentFileHash } = this.controller.getOpenFiles()
        return html`
            <div class="toolbar">
                <div id="options-container">
                    ${createIcon(Settings)}
                    ${createIcon(Copy)}
                    ${createIcon(Ellipsis)}
                </div>
                <div id="tabs-container">
                    ${files.map(file => this.renderTab(file, file.hash() === currentFileHash))}
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
}