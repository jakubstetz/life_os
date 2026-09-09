/** Place a floating panel near an anchor, flipping and clamping to the viewport. */
export function placeFloat(
  anchor: DOMRect,
  size: { width: number; height: number },
  gap = 6,
  pad = 8,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - pad - (anchor.bottom + gap);
  const spaceAbove = anchor.top - gap - pad;
  let top: number;
  if (size.height <= spaceBelow || spaceBelow >= spaceAbove) {
    top = anchor.bottom + gap;
  } else {
    top = anchor.top - gap - size.height;
  }
  top = Math.min(Math.max(top, pad), Math.max(pad, vh - pad - size.height));
  let left = anchor.left;
  left = Math.min(Math.max(left, pad), Math.max(pad, vw - pad - size.width));
  return { top, left };
}
