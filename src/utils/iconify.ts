import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';
import iconSet from '@iconify-json/vscode-icons/icons.json';

export function getDirectoryIcon(directoryPath: string, isOpen: boolean): string {
    // get name from vscode icons "file_type_cpp.svg"
    const iconFileName = (isOpen ? getIconForOpenFolder(directoryPath) : getIconForFolder(directoryPath)) ?? 'default_file.svg'
    const iconName = iconFileName.replace('.svg', '').replace(/_/g, '-');  // parse to iconify format
    return createSvg(iconName);
}

export function getFileIcon(filePath: string): string {
    const iconFileName = getIconForFile(filePath) ?? "default_file.svg"; // get name from vscode icons "file_type_cpp.svg"
    const iconName = iconFileName.replace('.svg', '').replace(/_/g, '-');  // parse to iconify format
    return createSvg(iconName);
}

function createSvg(iconName: string) : string {
    // @ts-ignore
    const iconData: any = iconSet.icons[iconName];  // get svg data from iconify
    if (!iconData) {
        return getDefaultFileIcon(); 
    }
  
    const svg = `
    <svg width="16" height="16" viewBox="0 0 ${iconSet.width || 16} ${iconSet.height || 16}" xmlns="http://www.w3.org/2000/svg">
        ${iconData.body}
    </svg>`;
  
    return svg;
}

function getDefaultFileIcon(): string {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <path fill="#c5c5c5" d="M20.414 2H5v28h22V8.586ZM7 28V4h12v6h6v18Z" />
    </svg>`
}