import type { ReactiveController, ReactiveControllerHost } from "lit";
import { filePathsToTree, getAllLeafNodes, TreeNode, type Tree } from "./file-explorer/tree";
import { normalizePath, parsePath } from "./utils/path";

// lit reactive controller: https://lit.dev/docs/composition/controllers/
// stores code editor state globally (via singleton implementation).

export class File {
    path: string = ""
    contents: string = ""

    constructor(path: string, contents: string) {
        this.path = normalizePath(path);
        this.contents = contents;
    }

    getExtension(): string {
        const path = parsePath(this.path);
        const ext = path.ext;
        return ext.startsWith('.') ? ext.substring(1) : ext;
    }

    hash(): string {
        return `${this.path}`;
    }
}

export class TestCaseResult {
    name: string = ""
    passed: boolean = false
    message: string = ""
}

export class CodeJobResult {
    testCaseResults: TestCaseResult[] = []
    duration: string = ''
}

export class CodeEditorController implements ReactiveController {
    private hosts = new Set<ReactiveControllerHost>();
    private _tree: Tree = null!;

    private _files: Map<string, File> = new Map([]);
    private _openFiles: string[] = [];
    private _currentFile: string | null = null;

    private _explorerVisible: boolean = true;


    constructor(
            files: File[], 
            currentFile: File | null,
            openAll: boolean) {
        const fileMap = new Map<string, File>();
        files.forEach(file => fileMap.set(file.hash(), file))
        this._files = fileMap;

        this._currentFile = currentFile !== null ? currentFile.hash() : null;
        this._tree = filePathsToTree(files.map(file => file.path))

        if (openAll) {
            this._files.forEach(file => this._openFiles.push(file.hash()));
        } else if (this._currentFile !== null) {
            this._openFiles.push(this._currentFile)
        }
    }

    addHost(host: ReactiveControllerHost) {
        this.hosts.add(host);
        host.addController(this);
    }

    removeHost(host: ReactiveControllerHost) {
        this.hosts.delete(host);
    }


    selectFile(path: string) {
        // this._currentFile = path;
        this.notifyAll();
    }


    // Tree stuff:

    getTree(): Tree {
        return this._tree;
    }

    deleteNode(node: TreeNode): void {
        if (!node.parent) {
            return;
        }

        const actualParent = this._tree.findNodeByHash(node.parent.hash());
        if (!actualParent) {
            return; 
        }

        const hash = node.hash();
        actualParent.children = actualParent.children.filter(child => child.hash() != hash);

        this.pruneFiles(true);
        this.notifyAll();
    }

    newNode(parentHash: string, newNode: TreeNode): void {
        const actualParent = this._tree.findNodeByHash(parentHash);
        if (!actualParent) {
            return;
        }

        newNode.parent = actualParent;
        actualParent.children.push(newNode);
        if (!newNode.isDirectory) {  // if file, need to add to state, notify all called in child
            const file = new File(newNode.getFullPathNormalized(), '');
            this.addFile(file, true);
        } else {
            this.notifyAll();
        }
    }


    // File stuff:

    getExplorerVisibility() {
        return this._explorerVisible;
    }

    toggleExplorer() {
        this._explorerVisible = !this._explorerVisible;
        this.notifyAll();
    }

    getFiles() : Map<string, File> {
        return this._files;
    }

    /**
     * Returns the state of what files are currently open, and what file the is currently being viewed.
     * Specifically useful for the editor itself.
     */
    getOpenFiles() : { files: File[], currentFileHash: string | null } {
        const keys = this._files.keys().filter(hash => this._openFiles.includes(hash))
        const openFiles = keys
            .map(key => this._files.get(key))
            .filter(file => file !== undefined)
            .toArray()

        return {
            files: openFiles,
            currentFileHash: this._currentFile
        };
    }

    /**
     * Sets the current file via a path.
     * Useful for when a consumer doesn't have file objects but file paths instead (file paths contain hashes)
     */
    setCurrentFileViaPath(filePath: string) {
        const file = this._files.values().find(file => file.path === filePath) ?? null;
        if (!file) {
            return;
        }

        const isOpen = this._openFiles.find(hash => hash === file.hash());
        if (!isOpen) {
            this._openFiles.push(file.hash())
        }

        this._currentFile = file.hash();
        this.notifyAll();
    }

    /**
     * Sets the current file via a file hash.
     */
    setCurrentFile(fileHash: string) {
        const isOpen = this._openFiles.find(hash => hash === fileHash);
        if (!isOpen) {
            this._openFiles.push(fileHash)
        }

        this._currentFile = fileHash;
        this.notifyAll();
    }

    private removeFromOpenFiles(fileHash: string) {
        const newOpenFiles: string[] = []
        this._openFiles.forEach((hash, idx) => {
            if (hash === this._currentFile && hash === fileHash) {
                const selectorOffset = idx > 0 ? -1 : 1;
                const newIdx = idx + selectorOffset;
                this._currentFile = newIdx >= 0 && newIdx < this._openFiles.length 
                    ? (this._openFiles[newIdx] ?? null) 
                    : null;
            }

            if (fileHash !== hash) {
                newOpenFiles.push(fileHash)
            }
        })

        this._openFiles = this._openFiles.filter(hash => hash !== fileHash);
    }

    closeFile(fileHash: string) {
        this.removeFromOpenFiles(fileHash);
        this.notifyAll();
    }

    removeFileViaPath(filePath: string, notify: boolean = true) {
        const file = this._files.values().find(file => file.path === filePath) ?? null;
        if (!file) {
            if (notify) this.notifyAll();
            return;
        }

        const hash = file.hash();
        const _ = this._files.delete(hash);
        this.removeFromOpenFiles(hash);
        if (notify) this.notifyAll();
    }

    addFile(file: File, setCurrent: boolean = false) {
        this._files.set(file.hash(), file);
        if (setCurrent) {
            this.setCurrentFile(file.hash());  // notify all called in child method
        } else {
            this.notifyAll();
        }
    }

    pruneFiles(notify: boolean = true): void {
        const nodePaths = new Set(
            getAllLeafNodes(this._tree.root)
                .map(node => node.getFullPathNormalized()));

        for (const [hash, file] of this._files) {
            const path = normalizePath(file.path);
            if (!nodePaths.has(path)) {
                this.removeFileViaPath(path, false)
            }
        }

        if (notify) this.notifyAll();
    }



    private notifyAll() {
        this.hosts.forEach(host => host.requestUpdate());
    }

    // Lifecycle hooks for each host
    hostConnected() {}
    hostDisconnected() {}
}