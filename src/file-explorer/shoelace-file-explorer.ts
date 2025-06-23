
import { css, html, LitElement, type TemplateResult, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ref, createRef, type Ref } from 'lit/directives/ref.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { Tree, TreeNode } from "./tree";
import { CodeEditorController } from "../controller";

import { parsePath } from "../utils/path.ts";
import { getDirectoryIcon, getFileIcon } from "../utils/iconify.ts";

import '@shoelace-style/shoelace/dist/components/tree/tree.js';
import '@shoelace-style/shoelace/dist/components/tree-item/tree-item.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';

import { SlDropdown, SlInput, SlTreeItem } from "@shoelace-style/shoelace";

// Uses shoelace's tree component to render the file system tree
// (see: https://shoelace.style/components/tree)

function generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

@customElement("shoelace-file-explorer")
export class ShoelaceFileExplorer extends LitElement {
    // @ts-ignore
    @property({attribute: false})
    controller!: CodeEditorController;

    private _initialized = false;

    protected override createRenderRoot() {
        return this;
    }

    protected override willUpdate(changedProperties: PropertyValues) {
        if (changedProperties.has('controller') && this.controller && !this._initialized) {
            this.controller.addHost(this);
            this._initialized = true;
        }
    }

    override connectedCallback() {
        super.connectedCallback();
        
        this.controller.getTree().onChange(() => {
            this.requestUpdate();
        });
    }


    private treeItemRefs: Ref<SlTreeItem>[] = [];
    private dropDownRefs: Ref<SlDropdown>[] = [];

    private unselectAll() {
        this.treeItemRefs.forEach(tiRef => {
            const ti = tiRef.value;
            if (ti) {
                ti.selected = false;
            }
        })
    }

    private closeAllDropDowns(except: SlDropdown) {
        this.dropDownRefs.forEach(ddRef => {
            const dd = ddRef.value;
            if (dd && dd !== except) {
                dd.open = false;
            }
        })
    }

    private renderNodeIcon(node: TreeNode, treeItemRef: Ref<SlTreeItem>) {
        if (node.isDirectory) {
            const ti = treeItemRef.value;
            const isOpen = (ti && ti.expanded) ?? false;
            return unsafeHTML(getDirectoryIcon(node.value, isOpen));
        } else {
            const fileName = parsePath(node.value).base;
            return unsafeHTML(getFileIcon(fileName));
        }
    }

    private handleDeleteFolder(node: TreeNode) {
        const tree = this.controller.getTree();
        if (!node.parent) {
            return;
        }

        const actualParent = tree.findNodeByHash(node.parent.hash());
        if (!actualParent) {
            return; 
        }

        const hash = node.hash();
        actualParent.children = actualParent.children.filter(child => child.hash() != hash);
        this.requestUpdate();
    }

    private handleNewFolder(tree: Tree, node: TreeNode) {
        const nodeHash = node.hash();

        // getting root
        let currentNode: TreeNode = node;
        while (currentNode.parent) {
            currentNode = currentNode.parent
        }

        let tempTree = tree.clone();
        const nodeClone = tempTree.findNodeByHash(nodeHash);
        if (!nodeClone) {
            return;
        }

        const tempNodeValue = generateGuid();
        const placeholderNode = new TreeNode(tempNodeValue, [], nodeClone, true);
        nodeClone.children.push(placeholderNode);

        this._tempNodeValues.push(tempNodeValue);
        this._tempTree = tempTree;
        this.requestUpdate();
    }

    private renderInput(node: TreeNode): TemplateResult {
        let slInput: SlInput | null = null;
        let cancelled: boolean = false;

        const handleRef = (el?: Element) => {
            if (el) {
                // Small delay to ensure element is fully initialized
                setTimeout(() => {
                    slInput = el as SlInput
                    slInput.focus();
                }, 0);
            }
        };

        const onBlur = () => {
            this._tempTree = null;

            if (slInput && !cancelled) {
                console.log("onBlur: ", slInput.value);

                const tree = this.controller.getTree();
                if (!node.parent) return;
                const actualParent = tree.findNodeByHash(node.parent.hash());
                if (!actualParent) return;
                const newNode = new TreeNode(slInput.value, [], actualParent, node.isDirectory);
                actualParent.children.push(newNode);
            } else {
                console.log("onBlur");
            }

            this.requestUpdate();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!slInput) {
                return;
            }

            if (e.key === 'Enter') {
                slInput.blur();
                e.preventDefault();
            }
            else if (e.key === 'Escape') {
                cancelled = true;
                slInput.blur();
            }
        };

        return html`
            <sl-tree-item>
                <sl-input 
                    ${ref(handleRef)} 
                    @sl-blur=${onBlur} 
                    @keydown=${handleKeyDown} 
                    size="small">
                </sl-input>
            </sl-tree-item>
        `;
    }

    private renderNode(tree: Tree, node: TreeNode): TemplateResult {
        if (this._tempNodeValues.find(tmpVal => tmpVal === node.value)) {
            return this.renderInput(node);
        }

        const dropdownRef: Ref<SlDropdown> = createRef();
        const treeItemRef: Ref<SlTreeItem> = createRef();

        this.dropDownRefs.push(dropdownRef);
        this.treeItemRefs.push(treeItemRef);

        // dirty ass event handlers setup to get correct left/right click behavior

        const signalUpdatedFile = () => {
            const path = node.getFullPathNormalized();
            this.controller.setCurrentFileViaPath(path)
        }

        const dropdownOnClick = (e: MouseEvent) => {
            // triggered only when the user clicks the node label
            console.log('dropdownOnClick')
            e.preventDefault();
            e.stopPropagation();

            const ti = treeItemRef.value;
            if (ti) {
                if (node.isDirectory) {
                    ti.expanded = !ti.expanded;
                } else {
                    this.unselectAll();
                    ti.selected = true;
                    signalUpdatedFile();
                }
            }

        }

        const dropdownOnMouseDown = (e: MouseEvent) => {
            if (e.button !== 2) {
                e.stopPropagation();
            }
        }

        const onContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        }

        const tiHandle = (e: MouseEvent) => {
            // triggered only when the user clicks the space outside the node container
            console.log('tiHandle')
            if (!dropdownRef.value)
                return;

            const dd = dropdownRef.value;
            if (e.button == 2) {
                e.stopPropagation();
                this.closeAllDropDowns(dd);
                dd.open = !dd.open;
            } else if (treeItemRef.value) {
                dd.hide();

                // shoelace tree automatically switches the currently selected node in this case
                // we signal without explicitly setting the node
                this.unselectAll();
                treeItemRef.value.selected = true;
                signalUpdatedFile();
            }
        }

        const menuContents = node.isDirectory 
            ? html`
                <sl-menu-item @mousedown=${() => this.handleNewFolder(tree, node)}>
                    New Folder
                </sl-menu-item>
                <sl-menu-item @mousedown=${() => this.handleDeleteFolder(node)}>
                    Delete
                </sl-menu-item>
            `
            : html`
                <sl-menu-item>Delete</sl-menu-item>
            `

        const childrenTemplates = node.children.map(child => this.renderNode(tree, child)) 
        return html`
            <sl-tree-item ${ref(treeItemRef)}>
                <div style="flex: 1" @mousedown=${tiHandle} @contextmenu=${onContextMenu}>
                    <sl-dropdown ${ref(dropdownRef)} class="context-dropdown">
                        <div slot="trigger" 
                            @click=${dropdownOnClick} 
                            @mousedown=${dropdownOnMouseDown} 
                            @contextmenu=${onContextMenu}
                            >
                            <div class="node-label">
                                ${this.renderNodeIcon(node, treeItemRef)} &nbsp; ${node.value}
                            </div>
                        </div>
                        <sl-menu>
                            ${menuContents}
                        </sl-menu>
                    </sl-dropdown>
                </div>
                ${childrenTemplates}
            </sl-tree-item>
        `
    }

    private renderExplorerHeader() {
        return html`
            <style>
                #explorer-header {
                    height: 30px;
                    box-sizing: border-box;

                    font-family: var(--sl-font-sans);
                    font-weight: var(--sl-font-weight-bold);
                    border-bottom: 1px solid #3e3e42;
                    padding: 0.5rem 0.6rem;
                }
            </style>
            <div id="explorer-header">
                Explorer
            </div>
        `
    }


    private _tempNodeValues: string[] = [];
    private _tempTree: Tree | null = null;

    protected override render() {
        const tree = this._tempTree ?? this.controller.getTree();
        const isVisible = this.controller.getExplorerVisibility();

        const styles = css`
            #file-explorer {
                width: 250px;
                min-width: 250px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12px;
                user-select: none;
                background: #252526;
                color: #cccccc;
                border-right: 1px solid #3e3e42;
                overflow-y: auto;
                height: 100%;
                flex-shrink: 0;
            }

            #file-explorer[hidden] {
                display: none;
            }

            .no-files {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
            }

            // properties for controlling shoelace tree items appearance
            sl-tree-item::part(base) {
                color: white;
            }
            
            sl-tree-item::part(label) {
                // background-color: white !important;
                // width: 100%;
                flex: 1;
            }
            
            sl-tree-item::part(expand-button) {}
            
            sl-tree-item::part(base):hover {}


            .node-label {
                display: flex;
                align-items: center;
                font-size: 0.85rem;
            }

            sl-tree-item::part(label) sl-input {}
        `

        if (!tree.root) {
            return html`
                ${styles}
                <div id="file-explorer" ?hidden=${!isVisible} class="no-files">
                    No files
                </div>
            `
        }

        return html`
            <style>
                ${styles}
            </style>
            <div id="file-explorer" ?hidden=${!isVisible}>
                ${this.renderExplorerHeader()}
                <sl-tree selection="leaf" style="--indent-guide-width: 1px;">
                    ${tree.root.children.map(node => this.renderNode(tree, node))}
                </sl-tree>
            </div>
        `;
    }
}