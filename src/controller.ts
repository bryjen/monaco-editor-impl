import type { ReactiveController, ReactiveControllerHost } from "lit";
import { filePathsToTree, type Tree } from "./file-explorer/tree";
import { parsePath } from "./utils/path";

// lit reactive controller: https://lit.dev/docs/composition/controllers/
// stores code editor state globally (via singleton implementation).

export class File {
    path: string = ""
    contents: string = ""

    constructor(path: string, contents: string) {
        this.path = path;
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

    setCurrentFile(fileHash: string) {
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