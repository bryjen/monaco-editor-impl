import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { printTree, type TreeNode } from "./tree";
import { CodeEditorController } from "../controller";

@customElement("file-explorer")
export class FileExplorer extends LitElement {
    private state: CodeEditorController = CodeEditorController.getInstance(this)

    protected override render() {
        return html`
            <div>
                something
            </div>
        `
    }

}