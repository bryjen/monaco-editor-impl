import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { Tree } from "./file-explorer/tree";

// lit reactive controller: https://lit.dev/docs/composition/controllers/
// stores code editor state globally (via singleton implementation).

export class CodeEditorController implements ReactiveController {
    private static instance: CodeEditorController;

    private hosts = new Set<ReactiveControllerHost>();
    private _currentFile: string | null = null;
    private _files: string[] = [];
    private _tree: Tree = null!;

    private constructor() {}

    static getInstance(host: ReactiveControllerHost): CodeEditorController {
        if (!this.instance) {
            this.instance = new CodeEditorController();
        }
        this.instance.addHost(host);
        return this.instance;
    }

    addHost(host: ReactiveControllerHost) {
        this.hosts.add(host);
        host.addController(this);
    }

    removeHost(host: ReactiveControllerHost) {
        this.hosts.delete(host);
    }

    selectFile(path: string) {
        this._currentFile = path;
        this.notifyAll();
    }

    private notifyAll() {
        this.hosts.forEach(host => host.requestUpdate());
    }

    // Lifecycle hooks for each host
    hostConnected() {}
    hostDisconnected() {}

    get currentFile() { return this._currentFile; }
}