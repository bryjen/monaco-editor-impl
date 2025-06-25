import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { Maximize, SquareTerminal, ListTodo, FileOutput } from 'lucide';
import { createIcon, createIconWithDim } from "./utils/lucide";
import type { Ref } from "lit/directives/ref.js";
import type { SlSplitPanel } from "@shoelace-style/shoelace";
import { TestCaseResult, type CodeEditorController } from "./controller";

@customElement("test-runner")
export class TestRunner extends LitElement {

    // @ts-ignore
    @property({attribute: false})
    splitPanelRef!: Ref<SlSplitPanel>;

    // @ts-ignore
    @property({attribute: false})
    controller!: CodeEditorController;

    private _initialized = false;

    protected override willUpdate(changedProperties: PropertyValues) {
        if (changedProperties.has('controller') && this.controller && !this._initialized) {
            this.controller.addHost(this);
            this._initialized = true;

            this.controller.registerCallback("onCodeExecutionRequest", _ => {
                this.toggleVisible();
            })
        }
    }

    static override styles = [
        css`
            #test-runner-container {
                display: flex;
                flex-direction: column;
                justify-content: center;

                font-size: 12px;
                font-family: var(--sl-font-sans);

                background: #252526;
                color: #cccccc;
                height: 100%;
            }

            #test-runner-header {
                align-items: center;
                display: flex;
                flex: none;

                font-weight: var(--sl-font-weight-bold);

                height: 30px;
                box-sizing: border-box;
                border-bottom: 1px solid #3e3e42;
                padding: 0.5rem 0.6rem;

                user-select: none;
            }

            .test-runner-button {
                display: flex;
                align-items: center;

                padding: 6px;
                border-radius: 6px;
                cursor: pointer;
            }

            .test-runner-button:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            #tabs-container {
                display: flex;
                flex: none;
                align-items: center;
                gap: 0.15rem;
                padding: 0.2rem;
                margin: 0.25rem;
            }

            .tab {
                display: flex;
                align-items: center;
                border-radius: 0.5rem;

                font-size: var(--sl-font-size-2x-small);
                font-weight: var(--sl-font-weight-semibold);

                gap: 0.25rem;
                padding: 0.2rem;

                user-select: none;
                cursor: pointer;
            }

            .tab.active {
                background: rgba(255, 255, 255, 0.05);
                // font-weight: var(--sl-font-weight-bold);
            }

            .tab:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            #tab-contents-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow-y: auto;

                align-items: center;
                justify-content: start;
            }

            #no-content-container {
                user-select: none;
                padding-top: 1rem;
            }
        `,
        css`
            #tab-contents-container.test-cases-container {
                justify-content: start !important;
                align-items: start !important;
            }

            #tab-contents-container.test-cases-container p, 
            #tab-contents-container.test-cases-container * p {
                margin: 0 !important;
            }

            .test-cases-grid-container {
                padding: 0.5rem;
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 0.25rem 0.25rem;
                align-items: center
            }

            sl-badge::part(base) {
                width: 100%;
            }
        `,
        css`
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

            #tab-contents-container.output-container {
                background-color: #1e1e1e;
                white-space: pre-wrap !important;
                justify-content: start !important;
                align-items: start !important;
            }

            #tab-contents-container.output-container p {
                margin: 0 !important;
                font-family: 'JetBrains Mono', monospace;
            }
        `
    ]

    @state()
    private currentTab: 'output' | 'cases' | null = 'cases';

    static readonly ThresholdPos: number = 80;
    static readonly ExpandedPos: number = 60;

    private toggleVisible() {
        const ss = this.splitPanelRef.value;
        if (ss && ss.position > TestRunner.ThresholdPos) {
            ss.position = TestRunner.ExpandedPos;
        }
    }

    private RenderTestRunnerHeader() {
        const toggleTestRunnerVisibility = () => {
            const ss = this.splitPanelRef.value;
            if (ss) {
                const newPos = ss.position > TestRunner.ThresholdPos ? TestRunner.ExpandedPos : 100;
                ss.position = newPos;
            }
        };

        return html`
            <div id="test-runner-header">
                <div @click=${toggleTestRunnerVisibility}>
                    <div class="test-runner-button">
                        ${createIcon(Maximize)}
                    </div>
                </div>

                <span>Test Runner</span>

                <br/>

                <div id="tabs-container">
                    <div class="tab ${this.currentTab === 'cases' ? 'active' : ''}"
                         @mousedown=${() => this.currentTab = 'cases'}>
                        ${createIcon(ListTodo)}
                        Test Cases
                    </div>
                    <div class="tab ${this.currentTab === 'output' ? 'active' : ''}"
                         @mousedown=${() => this.currentTab = 'output'}>
                        ${createIcon(SquareTerminal)}
                        Output
                    </div>
                </div>

                ${this.controller.loading 
                    ? html`
                        <div style="margin-left: auto">
                            <sl-progress-bar indeterminate style="--height: 6px;"></sl-progress-bar>
                            Running...
                        </div>
                    ` 
                    : ``}
            </div>
        `
    }

    private renderNoContent(): TemplateResult {
        return html`
            <div id="tab-contents-container">
                <div id="no-content-container">
                    You must run your code first.
                </div>
            </div>
        `
    }

    private renderCasesTab(): TemplateResult {
        const executionOutput = this.controller.codeJobResult;
        if (!executionOutput) {
            return html`
                <div id="tab-contents-container">
                    <div id="no-content-container">
                        <p>Waiting for finalized test results...</p>
                    </div>
                </div>
            `
        }

        const formatTestCaseResult = (tcr: TestCaseResult) => {
            return html`
                ${tcr.passed 
                    ? html`<sl-badge variant="success">Pass</sl-badge>` 
                    : html`<sl-badge variant="danger">Fail</sl-badge>`}

                <div>
                    <p style="font-weight: var(--sl-font-weight-bold)">
                        ${tcr.name}
                    </p>
                    <p>${tcr.message}</p>
                </div>
            `
        };

        return html`
            <div id="tab-contents-container" class="test-cases-container">
                <p>Duration: ${executionOutput.duration}</p>
                <div class="test-cases-grid-container">
                    ${executionOutput.testCaseResults.map(tcr => formatTestCaseResult(tcr))}
                </div>
            </div>
        `
    }

    private renderOutputTab(): TemplateResult {
        const executionOutput = this.controller.executionOutput ?? [];
        // const executionOutput: string[] =[];
        return html`
            <div id="tab-contents-container" class="output-container">
                ${executionOutput.map(out => html`<p>${out}</p>`)}
                <br/>
            </div>
        `
    }

    private getRenderCallback() {
        const hasContent = this.controller.executionOutput || this.controller.codeJobResult;
        if (!hasContent) {
            return this.renderNoContent();
        }

        switch (this.currentTab) {
            case 'cases':
                return this.renderCasesTab();
            case 'output':
                return this.renderOutputTab();
            default:
                return this.renderNoContent();
        }
    }

    protected override render(): TemplateResult {
        return html`
            <div id="test-runner-container">
                ${this.RenderTestRunnerHeader()}
                ${this.getRenderCallback()}
            </div>
        `;
    }
}