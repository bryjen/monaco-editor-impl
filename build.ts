import esbuild from 'esbuild';
import path from 'path';
import chokidar from 'chokidar';

import { readdirSync, rmSync, cpSync } from 'fs';


const isWatch = process.argv.includes('--watch');


async function buildProject() {

	// clean files (but not directory itself)
	const files = readdirSync('./out');
	files.forEach(file => {
	rmSync(`./out/${file}`, { recursive: true, force: true });
	});

	cpSync('./index.html', './out/index.html');  // copy index.html


	async function build(opts: esbuild.BuildOptions) {
		await esbuild.build(opts).then((result) => {
			if (result.errors.length > 0) {
				console.error(result.errors);
			}
			if (result.warnings.length > 0) {
				console.error(result.warnings);
			}
		});
	}


	// building monaco workers
	const workerEntryPoints: string[] = [
		'language/json/json.worker.js',
		'language/css/css.worker.js',
		'language/html/html.worker.js',
		'language/typescript/ts.worker.js',
		'editor/editor.worker.js'
	];

	await build({ entryPoints: workerEntryPoints.map((entry) => `./node_modules/monaco-editor/esm/vs/${entry}`),
		bundle: true,
		format: 'iife',
		outbase: './node_modules/monaco-editor/esm/',
		outdir: path.join(__dirname, 'out')
	});

	/*
	await build({
		entryPoints: ['index.ts'],
		bundle: true,
		format: 'iife',
		outdir: path.join(__dirname, 'out'),
		loader: {
			'.ttf': 'file'
		}
	});
	*/

	await build({
		entryPoints: [
			'src/index.ts'
		],
		platform: 'browser',
		bundle: true,
		format: 'iife',
		outdir: path.join(__dirname, 'out'),
		loader: {
			'.ttf': 'file'
		}
	});
}

if (isWatch) {
    await buildProject();

    let building = false;
    console.log('👀 Watching `src`...');

    const watcher = chokidar.watch('src', {
        ignoreInitial: true,
        persistent: true
    });

    watcher.on('change', async (path) => {
        if (building) 
			return;
        building = true;
        console.log(`📝 ${path} changed`);
		await buildProject();
        console.log(`✅ sources rebuilt`);
        building = false;
    });

    process.on('SIGINT', () => {
        console.log('\n👋 Stopping...');
        watcher.close();
        process.exit(0);
    });

} else {
	await buildProject();
}

