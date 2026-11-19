const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function coverScale(imgWidth, imgHeight, viewSize) {
  return Math.max(viewSize / imgWidth, viewSize / imgHeight);
}

export function displayedSize(photo, zoom, viewSize) {
  const cover = coverScale(photo.width, photo.height, viewSize);
  const disp = cover * zoom;
  return { width: photo.width * disp, height: photo.height * disp };
}

export function constrainOffset(photo, zoom, offsetX, offsetY, viewSize) {
  const { width: dw, height: dh } = displayedSize(photo, zoom, viewSize);
  const maxX = Math.max(0, (dw - viewSize) / 2);
  const maxY = Math.max(0, (dh - viewSize) / 2);
  return {
    offsetX: clamp(offsetX, -maxX, maxX),
    offsetY: clamp(offsetY, -maxY, maxY),
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function clampZoom(zoom) {
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

/**
 * Draw the cropped photo into a circular region of the destination canvas.
 * `crop.viewSize` is the reference size in which offsets and zoom are expressed.
 */
export function drawCroppedPhoto(ctx, photo, crop, cx, cy, diameter) {
  const viewSize = crop.viewSize || 280;
  const zoom = clampZoom(crop.zoom || 1);
  const { width: dwView, height: dhView } = displayedSize(photo, zoom, viewSize);
  const scale = diameter / viewSize;
  const dw = dwView * scale;
  const dh = dhView * scale;
  const dx = cx - dw / 2 + (crop.offsetX || 0) * scale;
  const dy = cy - dh / 2 + (crop.offsetY || 0) * scale;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

export function zoomAround(photo, crop, viewSize, newZoom, pivotX, pivotY) {
  const zoom = clampZoom(newZoom);
  const old = displayedSize(photo, crop.zoom || 1, viewSize);
  const next = displayedSize(photo, zoom, viewSize);
  const originX = (viewSize - old.width) / 2 + (crop.offsetX || 0);
  const originY = (viewSize - old.height) / 2 + (crop.offsetY || 0);
  const tX = old.width ? (pivotX - originX) / old.width : 0.5;
  const tY = old.height ? (pivotY - originY) / old.height : 0.5;
  const ox = pivotX - tX * next.width - (viewSize - next.width) / 2;
  const oy = pivotY - tY * next.height - (viewSize - next.height) / 2;
  return { zoom, ...constrainOffset(photo, zoom, ox, oy, viewSize) };
}

export function posterPointer(canvasEl, clientX, clientY, posterSize = 1080) {
  const rect = canvasEl.getBoundingClientRect();
  const scale = posterSize / rect.width;
  return {
    x: (clientX - rect.left) * scale,
    y: (clientY - rect.top) * scale,
    scale,
    rect,
  };
}

export function isInsideSlot(x, y, slot, extra = 12) {
  return Math.hypot(x - slot.cx, y - slot.cy) <= slot.diameter / 2 + extra;
}

/**
 * Convert a movement on the poster (in poster pixels) into a crop offset delta.
 */
export function posterDeltaToCrop(dxPoster, dyPoster, slot, viewSize) {
  const k = viewSize / slot.diameter;
  return { offsetX: dxPoster * k, offsetY: dyPoster * k };
}

export function attachSlotInteractions(canvasEl, getState, setCrop, onEmptyClick) {
  const pointers = new Map();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pinchStartDist = 0;
  let pinchStartCrop = null;
  let pinchPivot = null;

  const point = (event) => posterPointer(canvasEl, event.clientX, event.clientY);

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  canvasEl.addEventListener("pointerdown", (event) => {
    const { photo, slot } = getState();
    const p = point(event);
    pointers.set(event.pointerId, p);
    canvasEl.setPointerCapture(event.pointerId);

    if (!photo) {
      if (pointers.size === 1 && isInsideSlot(p.x, p.y, slot, 24) && onEmptyClick) {
        onEmptyClick();
      }
      return;
    }

    if (pointers.size === 2) {
      dragging = false;
      const pts = [...pointers.values()];
      pinchStartDist = distance(pts[0], pts[1]) || 1;
      pinchStartCrop = { ...getState().crop };
      pinchPivot = midpoint(pts[0], pts[1]);
      canvasEl.classList.add("is-pinching");
      event.preventDefault();
      return;
    }

    if (isInsideSlot(p.x, p.y, slot, 20)) {
      dragging = true;
      lastX = p.x;
      lastY = p.y;
      canvasEl.classList.add("is-dragging");
      event.preventDefault();
    }
  });

  canvasEl.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const p = point(event);
    pointers.set(event.pointerId, p);
    const { photo, crop, viewSize, slot } = getState();
    if (!photo) return;

    if (pointers.size >= 2 && pinchStartCrop) {
      const pts = [...pointers.values()];
      const dist = distance(pts[0], pts[1]) || 1;
      const factor = dist / pinchStartDist;
      const mid = midpoint(pts[0], pts[1]);
      // Pivot in crop-view space (the slot maps to a viewSize square)
      const pivotX = viewSize / 2 + ((mid.x - slot.cx) * viewSize) / slot.diameter;
      const pivotY = viewSize / 2 + ((mid.y - slot.cy) * viewSize) / slot.diameter;
      const next = zoomAround(
        photo,
        pinchStartCrop,
        viewSize,
        pinchStartCrop.zoom * factor,
        pivotX,
        pivotY
      );
      setCrop(next);
      event.preventDefault();
      return;
    }

    if (dragging) {
      const d = posterDeltaToCrop(p.x - lastX, p.y - lastY, slot, viewSize);
      lastX = p.x;
      lastY = p.y;
      const next = constrainOffset(
        photo,
        crop.zoom,
        (crop.offsetX || 0) + d.offsetX,
        (crop.offsetY || 0) + d.offsetY,
        viewSize
      );
      setCrop({ zoom: crop.zoom, ...next });
      event.preventDefault();
    }
  });

  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
      pinchStartDist = 0;
      pinchStartCrop = null;
      pinchPivot = null;
      canvasEl.classList.remove("is-pinching");
    }
    if (pointers.size === 0) {
      dragging = false;
      canvasEl.classList.remove("is-dragging");
    }
  };
  canvasEl.addEventListener("pointerup", endPointer);
  canvasEl.addEventListener("pointercancel", endPointer);

  canvasEl.addEventListener(
    "wheel",
    (event) => {
      const { photo, crop, viewSize, slot } = getState();
      if (!photo) return;
      const p = point(event);
      if (!isInsideSlot(p.x, p.y, slot, 40)) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.1 : -0.1;
      const pivotX = viewSize / 2 + ((p.x - slot.cx) * viewSize) / slot.diameter;
      const pivotY = viewSize / 2 + ((p.y - slot.cy) * viewSize) / slot.diameter;
      setCrop(zoomAround(photo, crop, viewSize, (crop.zoom || 1) + delta, pivotX, pivotY));
    },
    { passive: false }
  );

  canvasEl.addEventListener("keydown", (event) => {
    const { photo, crop, viewSize } = getState();
    if (!photo) return;
    const step = event.shiftKey ? 12 : 4;
    let { offsetX = 0, offsetY = 0, zoom = 1 } = crop;
    if (event.key === "ArrowLeft") offsetX -= step;
    else if (event.key === "ArrowRight") offsetX += step;
    else if (event.key === "ArrowUp") offsetY -= step;
    else if (event.key === "ArrowDown") offsetY += step;
    else if (event.key === "+" || event.key === "=") zoom += 0.1;
    else if (event.key === "-" || event.key === "_") zoom -= 0.1;
    else return;
    event.preventDefault();
    zoom = clampZoom(zoom);
    setCrop({ zoom, ...constrainOffset(photo, zoom, offsetX, offsetY, viewSize) });
  });
}

export async function loadImageFile(file, maxSide = 2000) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (Math.max(img.width, img.height) <= maxSide) return img;
    const scale = maxSide / Math.max(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await loadImage(canvas.toDataURL("image/jpeg", 0.92));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image."));
    img.src = src;
  });
}

export { MIN_ZOOM, MAX_ZOOM };
