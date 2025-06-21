// @ts-ignore
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js'; 
// @ts-ignore
import { initVimMode } from 'monaco-vim';

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl: (moduleId: string, label: string) => string;
    };
  }
}

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId: any, label: any) {
		if (label === 'json') {
			return './vs/language/json/json.worker.js';
		}
		if (label === 'css' || label === 'scss' || label === 'less') {
			return './vs/language/css/css.worker.js';
		}
		if (label === 'html' || label === 'handlebars' || label === 'razor') {
			return './vs/language/html/html.worker.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return './vs/language/typescript/ts.worker.js';
		}
		return './vs/editor/editor.worker.js';
	}
};

// TypeScript interfaces for Monaco types
interface CompletionItem {
    label: string;
    kind: monaco.languages.CompletionItemKind;
    insertText: string;
    insertTextRules?: monaco.languages.CompletionItemInsertTextRule;
    detail: string;
}

interface SnippetData {
    label: string;
    insertText: string;
    detail: string;
}

// C++ Symbol Table and Completion Provider
class CppIntelliSense {
    private stdlib: { [key: string]: string[] };
    private keywords: string[];
    private snippets: { [key: string]: SnippetData };
    private headers: { [key: string]: string[] };

    constructor() {
        this.stdlib = {
            'std::': ['cout', 'cin', 'endl', 'vector', 'string', 'map', 'set', 'list', 'queue', 'stack'],
            'std::cout': ['<<'],
            'std::cin': ['>>'],
            'std::vector': ['push_back', 'pop_back', 'size', 'empty', 'clear', 'at', 'front', 'back'],
            'std::string': ['length', 'size', 'substr', 'find', 'replace', 'append', 'c_str'],
            'std::map': ['insert', 'find', 'erase', 'size', 'empty', 'clear'],
        };

        this.keywords = [
            'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
            'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
            'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
            'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while',
            'class', 'private', 'protected', 'public', 'friend', 'inline', 'template',
            'virtual', 'bool', 'true', 'false', 'namespace', 'using', 'try', 'catch',
            'throw', 'new', 'delete', 'this'
        ];

        this.snippets = {
            'for': {
                label: 'for loop',
                insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
                detail: 'For loop with counter'
            },
            'while': {
                label: 'while loop',
                insertText: 'while (${1:condition}) {\n\t$0\n}',
                detail: 'While loop'
            },
            'if': {
                label: 'if statement',
                insertText: 'if (${1:condition}) {\n\t$0\n}',
                detail: 'If statement'
            },
            'class': {
                label: 'class definition',
                insertText: 'class ${1:ClassName} {\npublic:\n\t${2:// Constructor}\n\t${1:ClassName}();\n\t\nprivate:\n\t$0\n};',
                detail: 'Basic class template'
            },
            'main': {
                label: 'main function',
                insertText: 'int main() {\n\t$0\n\treturn 0;\n}',
                detail: 'Main function'
            },
            'include': {
                label: '#include directive',
                insertText: '#include <${1:iostream}>',
                detail: 'Include header file'
            }
        };

        this.headers = {
            'iostream': ['std::cout', 'std::cin', 'std::endl'],
            'vector': ['std::vector'],
            'string': ['std::string'],
            'map': ['std::map'],
            'set': ['std::set'],
            'algorithm': ['std::sort', 'std::find', 'std::max', 'std::min'],
            'cmath': ['sqrt', 'pow', 'sin', 'cos', 'tan', 'abs'],
            'cstdio': ['printf', 'scanf', 'FILE']
        };
    }

    getIncludedHeaders(code: string): Set<string> {
        const includeRegex = /#include\s*[<"](.*?)[>"]/g;
        const includes: Set<string> = new Set();
        let match;
        while ((match = includeRegex.exec(code)) !== null) {
			const value: string | undefined = match[1]
			if (value !== undefined) {
				includes.add(value);
			}
        }
        return includes;
    }

    isAfterDot(model: monaco.editor.ITextModel, position: monaco.Position): boolean {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);
        return /\.\s*$/.test(beforeCursor) || /\->\s*$/.test(beforeCursor);
    }

    isAfterScope(model: monaco.editor.ITextModel, position: monaco.Position): boolean {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);
        return /::\s*$/.test(beforeCursor);
    }

    isAfterInclude(model: monaco.editor.ITextModel, position: monaco.Position): boolean {
        const lineContent = model.getLineContent(position.lineNumber);
        return /^\s*#include\s*[<"]/.test(lineContent);
    }

    getObjectBeforeDot(model: monaco.editor.ITextModel, position: monaco.Position): string | null {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);
        const match = beforeCursor.match(/(\w+)(?:\.|->)\s*$/);
        return match ? match[1] : null;
    }

    getScopeBeforeDoubleColon(model: monaco.editor.ITextModel, position: monaco.Position): string | null {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);
        const match = beforeCursor.match(/(\w+)::\s*$/);
        return match ? match[1] : null;
    }

    provideCompletionItems(
			model: monaco.editor.ITextModel, 
			position: monaco.Position)
			: monaco.languages.ProviderResult<monaco.languages.CompletionList> {
        const code = model.getValue();
        const includedHeaders = this.getIncludedHeaders(code);
        let suggestions: any = [];

        // Header file completions
        if (this.isAfterInclude(model, position)) {
            suggestions = Object.keys(this.headers).map(header => ({
                label: header,
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: `${header}>`,
                detail: `Include ${header} header`
            }));
        }
        // Scope resolution completions (std::, etc.)
        else if (this.isAfterScope(model, position)) {
            const scope = this.getScopeBeforeDoubleColon(model, position);
            if (scope === 'std' && this.stdlib['std::']) {
                suggestions = this.stdlib['std::'].map(item => ({
                    label: item,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: item,
                    detail: `std::${item}`
                }));
            }
        }
        // Member access completions (object.method)
        else if (this.isAfterDot(model, position)) {
            const objectName = this.getObjectBeforeDot(model, position);
            
            // Simple heuristic: if object contains 'cout', suggest << operator
            if (objectName && objectName.includes('cout')) {
                suggestions = [{
                    label: '<<',
                    kind: monaco.languages.CompletionItemKind.Operator,
                    insertText: '<< $0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Stream insertion operator'
                }];
            }
            // If we detect vector-like patterns
            else if (objectName 
					 && (objectName.includes('vec') || objectName.includes('Vector'))
					 && (this.stdlib['std::vector'] !== undefined)) {
                suggestions = this.stdlib['std::vector'].map(method => ({
                    label: method,
                    kind: monaco.languages.CompletionItemKind.Method,
                    insertText: method + '($0)',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: `vector::${method}`
                }));
            }
        }
        // General completions
        else {
            // Add keywords
            suggestions.push(...this.keywords.map(keyword => ({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                detail: 'C++ keyword'
            })));

            // Add snippets
            suggestions.push(...Object.entries(this.snippets).map(([key, snippet]) => ({
                label: snippet.label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: snippet.insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: snippet.detail
            })));

            // Add std library based on includes
            for (const header of includedHeaders) {
                if (this.headers[header]) {
                    suggestions.push(...this.headers[header].map(item => ({
                        label: item,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: item,
                        detail: `From ${header}`
                    })));
                }
            }
        }

        return { suggestions };
    }
}

// Register the completion provider
const cppIntelliSense = new CppIntelliSense();

monaco.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
        return cppIntelliSense.provideCompletionItems(model, position);
    },
    triggerCharacters: ['.', ':', '<', '"']
});

// Register hover provider for basic documentation
monaco.languages.registerHoverProvider('cpp', {
    provideHover: (model: monaco.editor.ITextModel, position: monaco.Position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return;

        const documentation: { [key: string]: string } = {
            'std::cout': 'Standard output stream object',
            'std::cin': 'Standard input stream object',
            'std::endl': 'Inserts a newline character and flushes the stream',
            'std::vector': 'Sequence container that encapsulates dynamic size arrays',
            'std::string': 'String class to represent sequences of characters',
            'int': 'Integer data type (typically 32-bit)',
            'char': 'Character data type (8-bit)',
            'float': 'Single precision floating point type',
            'double': 'Double precision floating point type'
        };

        const doc = documentation[word.word];
        if (doc) {
            return {
                range: new monaco.Range(
                    position.lineNumber,
                    word.startColumn,
                    position.lineNumber,
                    word.endColumn
                ),
                contents: [{ value: `**${word.word}**\n\n${doc}` }]
            };
        }
    }
});

// Create the editor
const editor: monaco.editor.IStandaloneCodeEditor = monaco.editor.create(document.getElementById('container'), {
    value: [
        '#include <iostream>', 
        '#include <vector>',
        '', 
        'int main() {', 
        '    std::cout << "Hello, world!" << std::endl;',
        '    std::vector<int> vec;',
        '    vec.', // Try typing here to see completions
        '    return 0;', 
        '}'
    ].join('\n'),
    language: 'cpp',
    automaticLayout: true,
    suggestOnTriggerCharacters: true,
	minimap: {
		enabled: false
	},
	folding: true,
	foldingStrategy: 'auto',
	foldingHighlight: true,
	showFoldingControl: 'mouseover',
    quickSuggestions: {
        other: true,
        comments: false,
        strings: false
    }
});

editor.onKeyDown((e: monaco.IKeyboardEvent) => {
	// console.log('Key pressed:', e.keyCode, e.code);
    if (e.ctrlKey && e.keyCode === monaco.KeyCode.Enter) {
        e.preventDefault();
        console.log('Ctrl+Enter - Run code request');
    }
});

const vimMode = initVimMode(editor, document.getElementById('vim-status'));