export interface ScrollSnapshot {
  root: { top: number; left: number };
  items: Array<{ className: string; index: number; top: number; left: number }>;
}

function sameClass(root: HTMLElement, className: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*')).filter(element => element.className === className);
}

/** Guarda el desplazamiento de la raíz y de cada elemento desplazado, identificado por su clase y su posición entre los de esa clase. */
export function captureScroll(root: HTMLElement): ScrollSnapshot {
  const items: ScrollSnapshot['items'] = [];
  const scrolled = Array.from(root.querySelectorAll<HTMLElement>('*'))
    .filter(element => typeof element.className === 'string' && element.className && (element.scrollTop > 0 || element.scrollLeft > 0));

  for (const element of scrolled) {
    items.push({
      className: element.className,
      index: sameClass(root, element.className).indexOf(element),
      top: element.scrollTop,
      left: element.scrollLeft,
    });
  }

  return { root: { top: root.scrollTop, left: root.scrollLeft }, items };
}

export function restoreScroll(root: HTMLElement, snapshot: ScrollSnapshot): void {
  root.scrollTop = snapshot.root.top;
  root.scrollLeft = snapshot.root.left;

  for (const item of snapshot.items) {
    const element = sameClass(root, item.className)[item.index];
    if (!element) continue;
    element.scrollTop = item.top;
    element.scrollLeft = item.left;
  }
}
