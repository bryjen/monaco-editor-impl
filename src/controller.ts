import type { ReactiveController, ReactiveControllerHost } from "lit";
import { filePathsToTree, type Tree } from "./file-explorer/tree";
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

export class CodeEditorController implements ReactiveController {
    private static instance: CodeEditorController;

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


    getTree() : Tree {
        return this._tree;
    }


    // File stuff:

    getExplorerVisibility() {
        return this._explorerVisible;
    }

    toggleExplorer() {
        this._explorerVisible = !this._explorerVisible;
        this.notifyAll();
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

    closeFile(fileHash: string) {
        const newOpenFiles: string[] = []
        this._openFiles.forEach((hash, idx) => {
            if (hash === this._currentFile && hash === fileHash) {
                const selectorOffset = idx > 0 ? -1 : 1;
                this._currentFile = this._openFiles[idx + selectorOffset]!;
            }

            if (fileHash !== hash) {
                newOpenFiles.push(fileHash)
            }
        })

        this._openFiles = this._openFiles.filter(hash => hash !== fileHash);
        this.notifyAll();
    }



    private notifyAll() {
        this.hosts.forEach(host => host.requestUpdate());
    }

    // Lifecycle hooks for each host
    hostConnected() {}
    hostDisconnected() {}
}