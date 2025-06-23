import { createElement } from 'lucide';

export function createIcon(iconFunction: any, attrs = {}) {
    return createElement(iconFunction, {
        width: 16,
        height: 16,
        'stroke-width': 2,
        ...attrs
    });
}

export function createIconWithDim(iconFunction: any, dim: number, attrs = {}) {
    return createElement(iconFunction, {
        width: dim,
        height: dim,
        'stroke-width': 2,
        ...attrs
    });
}