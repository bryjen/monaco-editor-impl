import { normalizePath, parsePath } from '../utils/path'

export function filePathsToTree(filePaths: string[]) {
    let tree = new Tree();
    tree.root = new TreeNode(".", [], null, true);

    filePaths
        .map((rawPath: string) => parsePath(rawPath))
        .forEach((filePath: { dir: string; base: string; ext: string }) => {
            const pathArr = filePath.dir.split('/').filter(part => part !== '');
            pathArr.push(filePath.base);
            tree.addPath(pathArr, !filePath.ext); // true if directory (no extension)
        });

    printTree(tree.root);
    return tree;
}

export function getAllLeafNodes(root: TreeNode): TreeNode[] {
    const leafNodes: TreeNode[] = [];
    
    function traverse(node: TreeNode) {
        if (node.children.length === 0) {
            leafNodes.push(node);
        } else {
            node.children.forEach(child => traverse(child));
        }
    }
    
    traverse(root);
    return leafNodes;
}


// for debugging only

export function printTree(node: TreeNode, indent: string = ""): void {
    // console.log(`${indent}${node.value}${node.isDirectory ? '/' : ''}`);
    node.children.forEach(child => printTree(child, indent + "  "));
}

export function treeToString(node: TreeNode, indent: string = ""): string {
    const line = `${indent}${node.value}${node.isDirectory ? '/' : ''}`
    const lines = node.children.map(child => treeToString(child, indent + "   ")).join("\n")
    return line + "\n" + lines
}

export class TreeNode {
    value: string = "";
    children: TreeNode[] = [];
    parent?: TreeNode | null = null;
    isDirectory: boolean = true
    expanded: boolean = true;

    constructor(value: string, children: TreeNode[], parent: TreeNode | null, isDirectory: boolean) {
        this.value = value;
        this.children = children;
        this.parent = parent;
        this.isDirectory = isDirectory;
    }

    getFullPathNormalized(): string {
        if (!this.parent) {
            return this.value;
        }

        let currentNode: TreeNode = this;
        let path: string[] = [ currentNode.value ]
        while (currentNode.parent) {
            currentNode = currentNode.parent
            path.push(currentNode.value)
        }
        return normalizePath(path.reverse().join('/'))
    }

    hash(): string {
        return this.getFullPathNormalized();
    }

    clone(): TreeNode {
        const clonedNode = new TreeNode(this.value, [], null, this.isDirectory);
        
        // Clone children recursively
        clonedNode.children = this.children.map(child => {
            const clonedChild = child.clone();
            clonedChild.parent = clonedNode;
            return clonedChild;
        });
        
        return clonedNode;
    }
}

type TreeChangeListener = (root: TreeNode) => void;

export class Tree {
    root: TreeNode = null!;

    private listeners: TreeChangeListener[] = [];

    private notifyChange(): void {
        this.listeners.forEach(listener => listener(this.root));
    }

    onChange(listener: TreeChangeListener): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    addPath(pathArray: string[], isDirectory: boolean) {
        let changed: boolean = false;
        let currentNode = this.root;

        pathArray.forEach((pathPart: string, index: number) => {
            const childNode = currentNode.children.find(node => node.value === pathPart);
            if (childNode) {
                currentNode = childNode;
            } else {
                const isLastPart = index === pathArray.length - 1;
                const newNode = new TreeNode(pathPart, [], currentNode, isLastPart ? isDirectory : true);
                currentNode.children.push(newNode);
                currentNode = newNode;
                changed = true;
            }
        });

        if (changed) {
            this.notifyChange()
        }
    }

    clone() {
        let tree = new Tree();
        tree.root = this.root.clone();
        return tree;
    }

    findNodeByHash(hash: string): TreeNode | null {
        if (!this.root) {
            return null;
        }

        const searchNode = (node: TreeNode): TreeNode | null => {
            console.log(node)
            console.log(node.hash())
            if (node.hash() === hash) {
                return node;
            }

            for (const child of node.children) {
                const found = searchNode(child);
                if (found) {
                    return found;
                }
            }

            return null;
        };

        return searchNode(this.root);
    }
}