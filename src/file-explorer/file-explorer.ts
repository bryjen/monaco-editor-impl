import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import { type TreeNode } from "./tree";
import { CodeEditorController } from "../controller";

@customElement("file-explorer")
export class FileExplorer extends LitElement {
    @property({attribute: false})
    controller!: CodeEditorController;

    @state()
    private expandedNodes = new Set<TreeNode>();

    @state()
    private selectedNode: TreeNode | null = null;

    protected override createRenderRoot() {
        return this;
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
        
        const iconSymbol = state.hasChildren 
            ? (state.isExpanded ? '▼' : '▶') 
            : '';

        return html`
            <span 
                class="expand-icon ${iconClass}"
                @click=${(e: Event) => {
                    e.stopPropagation();
                    if (state.hasChildren) this.toggleExpanded(node);
                }}
            >
                ${iconSymbol}
            </span>
        `;
    }

    private renderNodeIcon(node: TreeNode) {
        return node.isDirectory 
            ? html`<span class="folder-icon">📁</span>`
            : html`<span class="file-icon">📄</span>`;
    }

    private renderNodeContent(node: TreeNode, depth: number) {
        const state = this.getNodeState(node);
        const indent = depth * 16; // 16px per level

        return html`
            <div 
                class="node ${state.isSelected ? 'selected' : ''}" 
                style="padding-left: ${indent}px"
                @click=${() => this.selectNode(node)}
            >
                ${this.renderExpandIcon(node, state)}
                ${this.renderNodeIcon(node)}
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
        if (!tree.root) {
            return html`<div class="file-explorer">No files</div>`;
        }

        return html`
            <style>
                .file-explorer {
                    width: 15vw;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 10px;
                    user-select: none;
                    background: #252526;
                    color: #cccccc;
                    border-right: 1px solid #3e3e42;
                    overflow-y: auto;
                    height: 100%;
                }

                .node {
                    display: flex;
                    align-items: center;
                    padding: 4px 8px;
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
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .children {
                    /* Children are rendered with increased depth padding */
                }

                .node-container {
                    /* Container for each node and its children */
                }
            </style>
            <div class="file-explorer">
                ${this.renderNode(tree.root)}
            </div>
        `;
    }
}