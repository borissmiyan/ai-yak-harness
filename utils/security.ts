// templates/ai-harness/utils/security.ts

import DOMPurify from 'dompurify';

type PurifyFactory = (windowInstance: Window) => typeof DOMPurify;

/**
 * Returns a robust DOMPurify instance whether running in a browser,
 * jsdom test environment, or ESM factory wrapper.
 */
function getPurifyInstance() {
    if (typeof (DOMPurify as unknown as { sanitize: unknown }).sanitize === 'function') {
        return DOMPurify;
    }
    if (typeof (DOMPurify as unknown as PurifyFactory) === 'function' && typeof window !== 'undefined') {
        return (DOMPurify as unknown as PurifyFactory)(window);
    }
    return DOMPurify;
}

/**
 * Sanitizes raw SVG strings to prevent SVG-based Stored XSS attacks.
 * Strips out <script>, inline event listeners (onload, onerror, onclick),
 * embedded foreignObjects, and dangerous protocols while preserving
 * standard SVG paths, shapes, coordinates, styles, and viewBox.
 */
export function sanitizeSvg(dirtySvg: string | null | undefined): string {
    if (!dirtySvg || typeof dirtySvg !== 'string' || dirtySvg.trim() === '') {
        return '';
    }

    const purify = getPurifyInstance();
    return purify.sanitize(dirtySvg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_ATTR: ['vector-effect'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'foreignObject'],
        FORBID_ATTR: [
            'onload',
            'onerror',
            'onclick',
            'onmouseover',
            'onmouseout',
            'onfocus',
            'onblur',
            'onchange',
            'onsubmit',
        ],
    });
}

/**
 * General HTML sanitization for rich text or formatted strings.
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined, options: Record<string, unknown> = {}): string {
    if (!dirtyHtml || typeof dirtyHtml !== 'string' || dirtyHtml.trim() === '') {
        return '';
    }

    const purify = getPurifyInstance();
    return purify.sanitize(dirtyHtml, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
        ...options,
    });
}

/**
 * Validates whether a given URL is safe to open or embed in an <a> or <img> tag.
 * Rejects javascript:, vbscript:, and dangerous data: HTML payloads,
 * including obfuscations with internal spaces or control characters.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return false;

    // Strip whitespace and ASCII control characters (0-32) without triggering ESLint no-control-regex
    const normalized = url
        .trim()
        .split('')
        .filter((char) => char.charCodeAt(0) > 32)
        .join('')
        .toLowerCase();

    // Block executable protocols
    if (
        normalized.startsWith('javascript:') ||
        normalized.startsWith('vbscript:')
    ) {
        return false;
    }

    // Strict validation for data: URIs - only allow safe binary media
    if (normalized.startsWith('data:')) {
        return (
            normalized.startsWith('data:image/png') ||
            normalized.startsWith('data:image/jpeg') ||
            normalized.startsWith('data:image/webp') ||
            normalized.startsWith('data:image/svg+xml') ||
            normalized.startsWith('data:application/pdf')
        );
    }

    return true;
}
