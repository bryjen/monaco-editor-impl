export function parsePath(filePath: string): { dir: string; base: string; ext: string } {
    const normalizedPath = filePath.replace(/\\/g, '/'); // Handle Windows paths
    const lastSlash = normalizedPath.lastIndexOf('/');
    
    const dir = lastSlash === -1 ? '' : normalizedPath.substring(0, lastSlash);
    const base = lastSlash === -1 ? normalizedPath : normalizedPath.substring(lastSlash + 1);
    const lastDot = base.lastIndexOf('.');
    const ext = lastDot === -1 ? '' : base.substring(lastDot);
    
    return { dir, base, ext };
}

export function normalizePath(path: string): string {
    return path.replace(/^(\.\/)+/, '');
}