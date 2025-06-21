import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { platform } from 'os';

const workerEntryPoints: string[] = [
	'language/json/json.worker.js',
	'language/css/css.worker.js',
	'language/html/html.worker.js',
	'language/typescript/ts.worker.js',
	'editor/editor.worker.js'
];

build({ entryPoints: workerEntryPoints.map((entry) => `./node_modules/monaco-editor/esm/vs/${entry}`),
	bundle: true,
	format: 'iife',
	outbase: './node_modules/monaco-editor/esm/',
	outdir: path.join(__dirname, 'out')
});

build({
	entryPoints: ['index.ts'],
	bundle: true,
	format: 'iife',
	outdir: path.join(__dirname, 'out'),
	loader: {
		'.ttf': 'file'
	}
});

build({
	entryPoints: [
		'src/index.ts'
	],
	platform: 'browser',
	external: ['path', 'fs', 'os'],
	bundle: true,
	format: 'iife',
	outdir: path.join(__dirname, 'out'),
	loader: {
		'.ttf': 'file'
	}
});

/**
 * @param {import ('esbuild').BuildOptions} opts
 */
function build(opts: any) {
	esbuild.build(opts).then((result) => {
		if (result.errors.length > 0) {
			console.error(result.errors);
		}
		if (result.warnings.length > 0) {
			console.error(result.warnings);
		}
	});
}