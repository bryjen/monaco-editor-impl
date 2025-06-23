import { html, LitElement, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { CodeEditorController, File } from "./controller";


@customElement("code-workspace")
export class CodeWorkspace extends LitElement {

    private _controller: CodeEditorController;

    constructor() {
        super()

        const file1 = new File("./src/main.cpp", `#include <iostream>
#include <vector>

int main() {
    std::cout << "Hello, world!" << std::endl;
    return 0;
}
`)

        const file2 = new File("./include/lib.hpp", `#ifndef _LIB_HPP_
#define _LIB_HPP_

namespace {
    int add(int, int);
}

#endif  // _LIB_HPP_
`)

        this._controller = new CodeEditorController(
            [ file1, file2 ], 
            file2,
            true)
    }

    // we disable the shadow DOM for monaco (propagated, else monaco will partially break)
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

                    contain: layout;
                }

                #inside-editor-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
            </style>
            <div id="editor-container">
                <!-- @ts-ignore -->
                <shoelace-file-explorer .controller=${this._controller}>
                </shoelace-file-explorer>

                <div id="inside-editor-container">
                    <!-- @ts-ignore -->
                    <editor-toolbar .controller=${this._controller}>
                    </editor-toolbar>

                    <!-- @ts-ignore -->
                    <monaco-editor .controller=${this._controller} style="flex: 1">
                    </monaco-editor>

                    <div>
                        <p>
                            FOOTER
                        </p>
                    </div>
                </div>
            </div>
        `
    }
}