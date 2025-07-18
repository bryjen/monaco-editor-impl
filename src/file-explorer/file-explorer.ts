import { html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { repeat } from "lit/directives/repeat.js";

import { type TreeNode } from "./tree";
import { CodeEditorController } from "../controller";

import { ChevronRight, ChevronDown } from 'lucide';
import { createIcon, createIconWithDim } from '../utils/lucide.ts'
import { parsePath } from "../utils/path.ts";
import { getDirectoryIcon, getFileIcon } from "../utils/iconify.ts";

@customElement("file-explorer")
export class FileExplorer extends LitElement {
    @property({attribute: false})
    controller!: CodeEditorController;

    @state()
    private expandedNodes = new Set<TreeNode>();

    @state()
    private selectedNode: TreeNode | null = null;

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
        
        // Listen for tree changes
        this.controller.getTree().onChange(() => {
            this.requestUpdate();
        });
    }

    private toggleExpanded(node: TreeNode) {
        if (this.expandedNodes.has(node)) {
            this.expandedNodes.delete(node);
        } else {
            this.expandedNodes.add(node);
        }
        this.requestUpdate();
    }

    private selectNode(node: TreeNode) {
        this.selectedNode = node;
        
        // Emit file selection event for non-directories
        if (!node.isDirectory) {
            this.dispatchEvent(new CustomEvent('file-selected', {
                detail: { node },
                bubbles: true
            }));
        }
        
        this.requestUpdate();
    }

    private getNodeState(node: TreeNode) {
        return {
            isExpanded: this.expandedNodes.has(node),
            isSelected: this.selectedNode === node,
            hasChildren: node.children.length > 0
        };
    }

    private getNodePath(node: TreeNode): string {
        const path: string[] = [];
        let current: TreeNode | null = node;
        
        while (current && current.parent) {
            path.unshift(current.value);
            current = current.parent;
        }
        
        return path.join('/');
    }

    private renderExpandIcon(node: TreeNode, state: ReturnType<typeof this.getNodeState>) {
        if (!node.isDirectory) {
            return html`<span class="expand-icon empty"></span>`;
        }

        const iconClass = state.hasChildren 
            ? (state.isExpanded ? 'expanded' : 'collapsed') 
            : 'empty';
        
        const iconSvg = state.hasChildren 
            ? (state.isExpanded ? createIcon(ChevronDown) : createIcon(ChevronRight))
            : ``;

        return html`
            <span class="expand-icon ${iconClass}">
                ${iconSvg}
            </span>
        `;
    }

    private renderNodeIcon(node: TreeNode, state: ReturnType<typeof this.getNodeState>) {
        if (node.isDirectory) {
            const isOpen = state.hasChildren && state.isExpanded;
            return unsafeHTML(getDirectoryIcon(node.value, isOpen));
        } else {
            const fileName = parsePath(node.value).base;
            return unsafeHTML(getFileIcon(fileName));
        }
    }

    private renderNodeContent(node: TreeNode, depth: number) {
        const state = this.getNodeState(node);
        const indent = depth * 12;

        const handleClick = (e: Event) => {
            e.stopPropagation();
            this.selectNode(node);
            if (state.hasChildren) {
                this.toggleExpanded(node);
            }

            if (!node.isDirectory) {
                const path = node.getFullPathNormalized();
                this.controller.setCurrentFileViaPath(path);
            }
        };

        return html`
            <div 
                class="node ${state.isSelected ? 'selected' : ''}" 
                style="padding-left: ${indent}px"
                @click=${handleClick}
            >
                ${this.renderExpandIcon(node, state)}
                ${this.renderNodeIcon(node, state)}
                <span class="node-label">${node.value}</span>
            </div>
        `;
    }

    private renderNodeChildren(node: TreeNode, state: ReturnType<typeof this.getNodeState>, depth: number) {
        if (!node.isDirectory || !state.isExpanded || !state.hasChildren) {
            return '';
        }

        return html`
            <div class="children">
                ${repeat(
                    node.children, 
                    (child) => child,
                    (child) => this.renderNode(child, depth + 1)
                )}
            </div>
        `;
    }

    private renderNode(node: TreeNode, depth: number = 0): any {
        const state = this.getNodeState(node);

        return html`
            <div class="node-container">
                ${this.renderNodeContent(node, depth)}
                ${this.renderNodeChildren(node, state, depth)}
            </div>
        `;
    }

    protected override render() {
        const tree = this.controller.getTree();
        const isVisible = this.controller.getExplorerVisibility();

        if (!tree.root) {
            return html`
                <div id="file-explorer" ?hidden=${!isVisible} class="no-files">
                    No files
                </div>
            `
        }

        return html`
            <style>
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

                .node {
                    display: flex;
                    align-items: center;
                    padding: 0 8px;
                    cursor: pointer;
                    white-space: nowrap;
                    line-height: 22px;
                }

                .node:hover {
                    background: #2a2d2e;
                }

                .node.selected {
                    background: #094771;
                }

                .expand-icon {
                    width: 16px;
                    height: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 4px;
                    font-size: 10px;
                    cursor: pointer;
                }

                .expand-icon.empty {
                    cursor: default;
                }

                .folder-icon, .file-icon {
                    margin-right: 6px;
                    font-size: 12px;
                }

                .node-label {
                    margin-left: 0.5rem;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            </style>
            <div id="file-explorer" ?hidden=${!isVisible}>
                ${this.renderNode(tree.root)}
            </div>
        `;
    }
}