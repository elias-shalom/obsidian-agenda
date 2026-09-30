const installedRoots = new WeakSet<HTMLElement>();

let activeTarget: HTMLElement | null = null;
let activeRoot: HTMLElement | null = null;
let tooltipElement: HTMLElement | null = null;
let pendingShow: number | null = null;
let pendingHide: number | null = null;
let pendingRoot: HTMLElement | null = null;
let pendingTarget: HTMLElement | null = null;
let originalDescribedBy: string | null = null;
let tooltipId = 0;

function clearPendingTimers(): void {
  if (pendingShow !== null) window.clearTimeout(pendingShow);
  if (pendingHide !== null) window.clearTimeout(pendingHide);
  pendingShow = null;
  pendingHide = null;
  pendingRoot = null;
  pendingTarget = null;
}

function hideTooltip(root?: HTMLElement): void {
  if (root && pendingRoot === root && pendingShow !== null) {
    window.clearTimeout(pendingShow);
    pendingShow = null;
    pendingRoot = null;
    pendingTarget = null;
  }
  if (root && activeRoot !== root) return;
  clearPendingTimers();

  if (activeTarget) {
    if (originalDescribedBy === null) {
      activeTarget.removeAttribute('aria-describedby');
    } else {
      activeTarget.setAttribute('aria-describedby', originalDescribedBy);
    }
  }

  tooltipElement?.remove();
  tooltipElement = null;
  activeTarget = null;
  activeRoot = null;
  originalDescribedBy = null;
}

function positionTooltip(target: HTMLElement, tooltip: HTMLElement): void {
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 10;
  const margin = 12;
  const placeAbove = targetRect.top >= tooltipRect.height + gap + margin;
  const top = placeAbove
    ? targetRect.top - tooltipRect.height - gap
    : targetRect.bottom + gap;
  const left = Math.max(
    margin,
    Math.min(targetRect.left + (targetRect.width - tooltipRect.width) / 2, window.innerWidth - tooltipRect.width - margin),
  );
  tooltip.setAttribute('data-placement', placeAbove ? 'top' : 'bottom');
  tooltip.setCssStyles({
    top: `${Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin))}px`,
    left: `${left}px`,
  });
}

function showTooltip(root: HTMLElement, target: HTMLElement): void {
  const text = target.dataset.oaTooltip?.trim();
  if (!text || !target.isConnected) return;
  if (activeTarget === target && tooltipElement) return;

  hideTooltip();
  activeTarget = target;
  activeRoot = root;
  originalDescribedBy = target.getAttribute('aria-describedby');

  const title = target.dataset.oaTooltipTitle?.trim();
  const description = target.dataset.oaTooltipDescription?.trim() || text;
  tooltipId += 1;

  tooltipElement = document.body.createDiv({ cls: 'oa-tooltip' });
  tooltipElement.id = `oa-tooltip-${tooltipId}`;
  tooltipElement.setAttribute('role', 'tooltip');
  tooltipElement.setCssStyles({ visibility: 'hidden', opacity: '0' });

  if (title) tooltipElement.createEl('div', { cls: 'oa-tooltip__title', text: title });
  tooltipElement.createEl('div', { cls: 'oa-tooltip__description', text: description });

  const describedBy = [originalDescribedBy, tooltipElement.id].filter(Boolean).join(' ');
  target.setAttribute('aria-describedby', describedBy);
  positionTooltip(target, tooltipElement);
  window.requestAnimationFrame(() => {
    if (tooltipElement?.id === `oa-tooltip-${tooltipId}`) {
      tooltipElement.addClass('oa-tooltip--visible');
      tooltipElement.setCssStyles({ visibility: 'visible', opacity: '1' });
    }
  });
}

function getTooltipTarget(event: Event, root: HTMLElement): HTMLElement | null {
  if (!(event.target instanceof Element)) return null;
  const target = event.target.closest<HTMLElement>('[data-oa-tooltip]');
  return target && root.contains(target) ? target : null;
}

export function installTooltips(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[title]').forEach(target => {
    const title = target.getAttribute('title')?.trim();
    if (!title) return;
    target.dataset.oaTooltip = title;
    target.removeAttribute('title');
  });

  if (installedRoots.has(root)) return;
  installedRoots.add(root);

  root.addEventListener('pointerover', event => {
    const target = getTooltipTarget(event, root);
    if (!target) return;
    if (pendingHide !== null) window.clearTimeout(pendingHide);
    pendingHide = null;
    if (target === activeTarget || target === pendingTarget) return;
    if (activeRoot === root) hideTooltip(root);
    if (pendingShow !== null) window.clearTimeout(pendingShow);
    pendingRoot = root;
    pendingTarget = target;
    pendingShow = window.setTimeout(() => {
      pendingShow = null;
      pendingRoot = null;
      pendingTarget = null;
      if (target.matches(':hover')) showTooltip(root, target);
    }, 350);
  });

  root.addEventListener('pointerout', event => {
    const eventTarget = event.target instanceof Node ? event.target : null;
    const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (pendingRoot === root && pendingTarget && eventTarget && pendingTarget.contains(eventTarget) &&
        (!relatedTarget || !pendingTarget.contains(relatedTarget))) {
      if (pendingShow !== null) window.clearTimeout(pendingShow);
      pendingShow = null;
      pendingRoot = null;
      pendingTarget = null;
    }
    if (!activeTarget || activeRoot !== root || activeTarget === document.activeElement) return;
    if (relatedTarget && activeTarget.contains(relatedTarget)) return;
    pendingHide = window.setTimeout(() => hideTooltip(root), 100);
  });

  root.addEventListener('focusin', event => {
    const target = getTooltipTarget(event, root);
    if (target) {
      if (pendingHide !== null) window.clearTimeout(pendingHide);
      pendingHide = null;
      showTooltip(root, target);
    }
  });

  root.addEventListener('focusout', event => {
    if (!activeTarget || activeRoot !== root) return;
    if (event.relatedTarget instanceof Node && activeTarget.contains(event.relatedTarget)) return;
    if (!activeTarget.matches(':hover')) hideTooltip(root);
  });
}

export function clearTooltips(root: HTMLElement): void {
  hideTooltip(root);
}