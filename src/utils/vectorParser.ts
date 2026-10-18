/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedVectorDrawable {
  width: string;
  height: string;
  viewportWidth: number;
  viewportHeight: number;
  svgContent: string;
  pathCount: number;
  paths: Array<{
    pathData: string;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: string;
    fillAlpha?: number;
    strokeAlpha?: number;
  }>;
}

/**
 * Checks if XML content is an Android Vector Drawable
 */
export function isAndroidVectorDrawable(xmlContent: string): boolean {
  if (!xmlContent || typeof xmlContent !== 'string') return false;
  const trimmed = xmlContent.trim();
  return (
    trimmed.includes('<vector') &&
    (trimmed.includes('xmlns:android') || trimmed.includes('android:pathData'))
  );
}

/**
 * Parses an Android Vector Drawable XML string into an SVG string and path metadata
 */
export function parseAndroidVectorXml(xmlContent: string): ParsedVectorDrawable | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.warn('Vector XML parse error:', parserError.textContent);
      return null;
    }

    const vectorEl = doc.querySelector('vector');
    if (!vectorEl) return null;

    // Helper to get attribute with or without namespace
    const getAttr = (el: Element, name: string): string => {
      return (
        el.getAttribute(`android:${name}`) ||
        el.getAttributeNS('http://schemas.android.com/apk/res/android', name) ||
        el.getAttribute(name) ||
        ''
      );
    };

    const width = getAttr(vectorEl, 'width') || '24dp';
    const height = getAttr(vectorEl, 'height') || '24dp';
    const viewportWidth = parseFloat(getAttr(vectorEl, 'viewportWidth')) || 24;
    const viewportHeight = parseFloat(getAttr(vectorEl, 'viewportHeight')) || 24;

    const paths: ParsedVectorDrawable['paths'] = [];
    const svgElements: string[] = [];

    // Helper to process color strings (e.g., #FF00AA, #AA00FF00 with alpha, @color/...)
    const formatColor = (color: string, defaultColor = 'currentColor'): string => {
      if (!color) return defaultColor;
      const clean = color.trim();
      if (clean.startsWith('#')) {
        // 8-digit hex: #AARRGGBB in Android -> #RRGGBBAA in CSS
        if (clean.length === 9) {
          const a = clean.substring(1, 3);
          const r = clean.substring(3, 5);
          const g = clean.substring(5, 7);
          const b = clean.substring(7, 9);
          return `#${r}${g}${b}${a}`;
        }
        return clean;
      }
      return clean;
    };

    // Recursive traversal to support <group> transformations
    const traverse = (node: Element, indent = '  ') => {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const tagName = child.tagName.toLowerCase();

        if (tagName === 'path') {
          const pathData = getAttr(child, 'pathData');
          if (!pathData) continue;

          const fillColorAttr = getAttr(child, 'fillColor');
          const strokeColorAttr = getAttr(child, 'strokeColor');
          const strokeWidthAttr = getAttr(child, 'strokeWidth');
          const fillAlphaAttr = getAttr(child, 'fillAlpha');
          const strokeAlphaAttr = getAttr(child, 'strokeAlpha');

          const fillColor = fillColorAttr ? formatColor(fillColorAttr) : strokeColorAttr ? 'none' : '#ffffff';
          const strokeColor = strokeColorAttr ? formatColor(strokeColorAttr) : 'none';
          const strokeWidth = strokeWidthAttr ? strokeWidthAttr.replace(/[a-z]/gi, '') : '1';

          paths.push({
            pathData,
            fillColor: fillColor !== 'none' ? fillColor : undefined,
            strokeColor: strokeColor !== 'none' ? strokeColor : undefined,
            strokeWidth: strokeWidthAttr || undefined,
            fillAlpha: fillAlphaAttr ? parseFloat(fillAlphaAttr) : undefined,
            strokeAlpha: strokeAlphaAttr ? parseFloat(strokeAlphaAttr) : undefined,
          });

          let attrs = `d="${pathData}" fill="${fillColor}"`;
          if (strokeColor !== 'none') {
            attrs += ` stroke="${strokeColor}" stroke-width="${strokeWidth}"`;
          }
          if (fillAlphaAttr) {
            attrs += ` fill-opacity="${fillAlphaAttr}"`;
          }
          if (strokeAlphaAttr) {
            attrs += ` stroke-opacity="${strokeAlphaAttr}"`;
          }

          svgElements.push(`${indent}<path ${attrs} />`);
        } else if (tagName === 'group') {
          const tx = getAttr(child, 'translateX') || '0';
          const ty = getAttr(child, 'translateY') || '0';
          const scaleX = getAttr(child, 'scaleX') || '1';
          const scaleY = getAttr(child, 'scaleY') || '1';
          const rotation = getAttr(child, 'rotation') || '0';
          const pivotX = getAttr(child, 'pivotX') || '0';
          const pivotY = getAttr(child, 'pivotY') || '0';

          const transforms: string[] = [];
          if (tx !== '0' || ty !== '0') transforms.push(`translate(${tx}, ${ty})`);
          if (rotation !== '0') transforms.push(`rotate(${rotation}, ${pivotX}, ${pivotY})`);
          if (scaleX !== '1' || scaleY !== '1') transforms.push(`scale(${scaleX}, ${scaleY})`);

          const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
          svgElements.push(`${indent}<g${transformAttr}>`);
          traverse(child, indent + '  ');
          svgElements.push(`${indent}</g>`);
        } else if (tagName === 'clip-path') {
          const pathData = getAttr(child, 'pathData');
          if (pathData) {
            svgElements.push(`${indent}<clipPath><path d="${pathData}" /></clipPath>`);
          }
        }
      }
    };

    traverse(vectorEl);

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewportWidth} ${viewportHeight}" width="100%" height="100%">
${svgElements.join('\n')}
</svg>`;

    return {
      width,
      height,
      viewportWidth,
      viewportHeight,
      svgContent,
      pathCount: paths.length,
      paths,
    };
  } catch (err) {
    console.error('Failed to parse Android Vector XML:', err);
    return null;
  }
}
