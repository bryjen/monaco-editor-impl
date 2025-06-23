import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/rating/rating.js';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('./shoelace/');

document.body.classList.add('sl-theme-dark');

export * from './code-workspace'
export * from './controller'
export * from './toolbar'
export * from './test-runner'

export * from './editor/monaco-editor'

export * from './file-explorer/file-explorer'
export * from './file-explorer/shoelace-file-explorer'
export * from './file-explorer/tree'