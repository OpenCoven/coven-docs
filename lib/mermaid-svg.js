const RESPONSIVE_ROOT_STYLE = 'width:100%;height:auto;display:block;';

export function normalizeMermaidSvg(svg) {
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
    const cleanedAttrs = attrs
      .replace(/\s(?:width|height)="[^"]*"/gi, '')
      .replace(/\sstyle="[^"]*"/i, '');

    return `<svg${cleanedAttrs} style="${RESPONSIVE_ROOT_STYLE}">`;
  });
}
