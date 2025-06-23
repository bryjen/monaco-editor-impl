import { css, html, LitElement, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import { Maximize } from 'lucide';
import { createIcon, createIconWithDim } from "./utils/lucide";
import type { Ref } from "lit/directives/ref.js";
import type { SlSplitPanel } from "@shoelace-style/shoelace";

@customElement("test-runner")
export class TestRunner extends LitElement {

    // @ts-ignore
    @property({attribute: false})
    splitPanelRef!: Ref<SlSplitPanel>;

    static override styles = [
        css`
            #test-runner-container {
                font-size: 12px;
                background: #252526;
                color: #cccccc;
            }

            #test-runner-header {
                align-items: center;
                display: flex;

                height: 30px;
                box-sizing: border-box;

                font-family: var(--sl-font-sans);
                font-weight: var(--sl-font-weight-bold);
                border-bottom: 1px solid #3e3e42;
                padding: 0.5rem 0.6rem;
            }

            .test-runner-button {
                display: flex;
                align-items: center;

                padding: 6px;
                border-radius: 6px;
            }
        `
    ]

    private RenderTestRunnerHeader() {
        const toggleTestRunnerVisibility = () => {
            const ss = this.splitPanelRef.value;
            if (ss) {
                const newPos = ss.position > 90 ? 70 : 100;
                ss.position = newPos;
            }
        };

        return html`
            <div id="test-runner-header">
                <div @click=${toggleTestRunnerVisibility}>
                    <sl-tooltip class="shoelace-tooltip" content="Toggle test runner" style="--show-delay: 0s">
                        <div class="test-runner-button">
                            ${createIcon(Maximize)}
                        </div>
                    </sl-tooltip>
                </div>

                Test Runner
            </div>
        `
    }

    protected override render(): TemplateResult {
        return html`
            <div id="test-runner-container">
                ${this.RenderTestRunnerHeader()}
                <p>
                    wsg gang
                </p>
            </div>
        `;
    }
}