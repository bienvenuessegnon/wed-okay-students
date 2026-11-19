import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/900.css";
import "@fontsource/montserrat/500-italic.css";
import "@fontsource/montserrat/600-italic.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/600-italic.css";
import "@fontsource/fraunces/700-italic.css";
import "./styles.css";

import {
  attachSlotInteractions,
  clampZoom,
  constrainOffset,
  loadImage,
  loadImageFile,
} from "./crop.js";
import {
  POSTER_SIZE,
  SLOT,
  drawPoster,
  loadLogo,
  waitForFonts,
} from "./poster.js";
import { buildPublicationText } from "./texts.js";

const VIEW_SIZE = 280;
const FIELDS = ["nom", "prenoms", "filiere", "annee", "universite", "activite"];

const state = {
  nom: "",
  prenoms: "",
  filiere: "",
  annee: "",
  universite: "",
  activite: "",
  photo: null,
  crop: { zoom: 1, offsetX: 0, offsetY: 0, viewSize: VIEW_SIZE },
  logos: {},
  ready: false,
  step: 1,
};

const els = {
  form: document.getElementById("form"),
  canvas: document.getElementById("poster"),
  photo: document.getElementById("photo"),
  photoAdd: document.getElementById("photo-add"),
  photoRemove: document.getElementById("photo-remove"),
  zoom: document.getElementById("zoom"),
  zoomValue: document.getElementById("zoom-value"),
  download: document.getElementById("download"),
  pubText: document.getElementById("pub-text"),
  copy: document.getElementById("copy"),
  share: document.getElementById("share"),
  copyStatus: document.getElementById("copy-status"),
  success: document.getElementById("success"),
  dropCard: document.getElementById("drop-card"),
  dropFrame: document.getElementById("drop-frame"),
  dropVeil: document.getElementById("drop-veil"),
  progressBtns: [...document.querySelectorAll(".progress-btn")],
  panels: [...document.querySelectorAll("[data-panel]")],
  modal: document.getElementById("save-modal"),
  savePreview: document.getElementById("save-preview"),
  saveShare: document.getElementById("save-share"),
  saveClose: document.getElementById("save-close"),
};

let raf = 0;
let exportCanvas = null;
let pendingSaveFile = null;
let dragDepth = 0;

function studentFromState() {
  return {
    nom: state.nom,
    prenoms: state.prenoms,
    filiere: state.filiere,
    annee: state.annee,
    universite: state.universite,
    activite: state.activite,
  };
}

function scheduleDraw() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    renderPreview();
  });
}

function renderPreview() {
  const ctx = els.canvas.getContext("2d");
  els.canvas.width = POSTER_SIZE;
  els.canvas.height = POSTER_SIZE;
  drawPoster(ctx, POSTER_SIZE, POSTER_SIZE, {
    student: studentFromState(),
    photo: state.photo,
    crop: state.crop,
    logos: state.logos,
  });
}

function updateText() {
  els.pubText.textContent = buildPublicationText(studentFromState());
}

function syncPhotoControls() {
  const has = Boolean(state.photo);
  els.zoom.disabled = !has;
  els.zoom.value = String(state.crop.zoom);
  els.zoomValue.textContent = `${state.crop.zoom.toFixed(1).replace(".", ",")}×`;
  els.photoRemove.hidden = !has;
  els.photoAdd.textContent = has ? "Changer la photo" : "Ajouter une photo";
}

function setCrop(next) {
  state.crop = { ...state.crop, ...next, viewSize: VIEW_SIZE };
  syncPhotoControls();
  scheduleDraw();
}

function goToStep(step) {
  const next = Math.min(3, Math.max(1, Number(step) || 1));
  state.step = next;
  for (const panel of els.panels) {
    const active = Number(panel.dataset.panel) === next;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  }
  for (const btn of els.progressBtns) {
    const n = Number(btn.dataset.step);
    btn.classList.toggle("is-current", n === next);
    btn.classList.toggle("is-done", n < next);
    if (n === next) btn.setAttribute("aria-current", "step");
    else btn.removeAttribute("aria-current");
  }
}

function bindForm() {
  for (const name of FIELDS) {
    const input = els.form.elements[name];
    if (!input) continue;
    input.addEventListener("input", () => {
      state[name] = input.value;
      scheduleDraw();
      updateText();
    });
  }
  for (const btn of els.form.querySelectorAll("[data-next]")) {
    btn.addEventListener("click", () => goToStep(btn.dataset.next));
  }
  for (const btn of els.progressBtns) {
    btn.addEventListener("click", () => goToStep(btn.dataset.step));
  }
}

function openFilePicker() {
  els.photo.click();
}

async function onPhotoSelected(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const img = await loadImageFile(file);
  state.photo = img;
  state.crop = { zoom: 1, offsetX: 0, offsetY: 0, viewSize: VIEW_SIZE };
  syncPhotoControls();
  scheduleDraw();
}

function removePhoto() {
  state.photo = null;
  state.crop = { zoom: 1, offsetX: 0, offsetY: 0, viewSize: VIEW_SIZE };
  els.photo.value = "";
  syncPhotoControls();
  scheduleDraw();
}

function bindDropTarget(el, highlightEl) {
  if (!el) return;
  el.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    highlightEl.classList.add("is-dragover");
    if (els.dropVeil && highlightEl === els.dropFrame) els.dropVeil.hidden = false;
  });
  el.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  el.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      highlightEl.classList.remove("is-dragover");
      if (els.dropVeil) els.dropVeil.hidden = true;
    }
  });
  el.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    highlightEl.classList.remove("is-dragover");
    if (els.dropVeil) els.dropVeil.hidden = true;
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    onPhotoSelected(file).catch(() => {
      els.copyStatus.textContent = "Cette image n'a pas pu être lue.";
    });
  });
}

function bindPhoto() {
  els.photoAdd.addEventListener("click", openFilePicker);
  els.photoRemove.addEventListener("click", removePhoto);
  if (els.dropCard) els.dropCard.addEventListener("click", openFilePicker);
  els.photo.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    onPhotoSelected(file).catch(() => {
      els.copyStatus.textContent = "Cette image n'a pas pu être lue.";
    });
  });
  els.zoom.addEventListener("input", () => {
    if (!state.photo) return;
    const zoom = clampZoom(Number(els.zoom.value));
    const next = constrainOffset(
      state.photo,
      zoom,
      state.crop.offsetX,
      state.crop.offsetY,
      VIEW_SIZE
    );
    setCrop({ zoom, ...next });
  });

  attachSlotInteractions(
    els.canvas,
    () => ({
      photo: state.photo,
      crop: state.crop,
      viewSize: VIEW_SIZE,
      slot: SLOT,
    }),
    setCrop,
    openFilePicker
  );

  bindDropTarget(els.dropCard, els.dropCard);
  bindDropTarget(els.dropFrame, els.dropFrame);
}

async function copyText() {
  const text = els.pubText.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    els.copyStatus.textContent = "Texte copié.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(els.pubText);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = document.execCommand("copy");
    sel.removeAllRanges();
    els.copyStatus.textContent = ok
      ? "Texte copié."
      : "Copie impossible, sélectionnez le texte manuellement.";
  }
  setTimeout(() => {
    if (els.copyStatus.textContent === "Texte copié.") els.copyStatus.textContent = "";
  }, 2500);
}

function fileName() {
  const parts = [state.prenoms, state.nom]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return parts ? `WED2026-OKAY-${parts}.png` : "WED2026-OKAY-Students.png";
}

function renderExport() {
  if (!exportCanvas) exportCanvas = document.createElement("canvas");
  exportCanvas.width = POSTER_SIZE;
  exportCanvas.height = POSTER_SIZE;
  const ctx = exportCanvas.getContext("2d");
  drawPoster(ctx, POSTER_SIZE, POSTER_SIZE, {
    student: studentFromState(),
    photo: state.photo,
    crop: state.crop,
    logos: state.logos,
  });
  return exportCanvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Export impossible."));
    }, "image/png");
  });
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function showSuccess() {
  goToStep(3);
  els.success.hidden = false;
}

function openSaveModal(blob, name) {
  if (els.savePreview.src && els.savePreview.src.startsWith("blob:")) {
    URL.revokeObjectURL(els.savePreview.src);
  }
  const url = URL.createObjectURL(blob);
  els.savePreview.src = url;
  pendingSaveFile = new File([blob], name, { type: "image/png" });
  els.modal.hidden = false;
  showSuccess();
}

function closeSaveModal() {
  els.modal.hidden = true;
  if (els.savePreview.src && els.savePreview.src.startsWith("blob:")) {
    URL.revokeObjectURL(els.savePreview.src);
    els.savePreview.src = "";
  }
  pendingSaveFile = null;
}

async function downloadPoster() {
  els.download.disabled = true;
  try {
    const canvas = renderExport();
    const blob = await canvasToBlob(canvas);
    const name = fileName();
    if (isIOS()) {
      openSaveModal(blob, name);
    } else {
      triggerDownload(blob, name);
      showSuccess();
    }
  } catch (err) {
    els.copyStatus.textContent = "Le téléchargement a échoué. Réessayez.";
  } finally {
    els.download.disabled = false;
  }
}

async function sharePoster() {
  if (!pendingSaveFile) return;
  if (navigator.canShare && navigator.canShare({ files: [pendingSaveFile] })) {
    try {
      await navigator.share({
        files: [pendingSaveFile],
        title: "Affiche WED 2026",
        text: buildPublicationText(studentFromState()),
      });
      closeSaveModal();
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  triggerDownload(pendingSaveFile, pendingSaveFile.name);
}

async function shareAll() {
  try {
    const canvas = renderExport();
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], fileName(), { type: "image/png" });
    const text = buildPublicationText(studentFromState());
    const payload = { files: [file], title: "Affiche WED 2026", text };
    if (navigator.canShare && navigator.canShare(payload)) {
      await navigator.share(payload);
      showSuccess();
      return;
    }
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Affiche WED 2026" });
      await copyText();
      showSuccess();
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  els.copyStatus.textContent = "Le partage n'est pas disponible. Téléchargez l'affiche, puis copiez le texte.";
}

function bindShareButton() {
  const supported = typeof navigator.canShare === "function";
  els.share.hidden = !supported;
  if (supported) els.share.addEventListener("click", shareAll);
}

function setStudent(data) {
  for (const name of FIELDS) {
    if (data[name] !== undefined) {
      state[name] = data[name];
      const input = els.form.elements[name];
      if (input) input.value = data[name];
    }
  }
  scheduleDraw();
  updateText();
}

async function loadPhotoFromUrl(src) {
  const img = await loadImage(src);
  state.photo = img;
  state.crop = { zoom: 1, offsetX: 0, offsetY: 0, viewSize: VIEW_SIZE };
  syncPhotoControls();
  renderPreview();
}

async function exportPngBlob() {
  const canvas = renderExport();
  return canvasToBlob(canvas);
}

async function boot() {
  bindForm();
  bindPhoto();
  bindShareButton();
  els.copy.addEventListener("click", copyText);
  els.download.addEventListener("click", downloadPoster);
  els.saveClose.addEventListener("click", closeSaveModal);
  els.saveShare.addEventListener("click", sharePoster);
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) closeSaveModal();
  });

  const [okay, gew, wed, mebH, mebV] = await Promise.all([
    loadLogo("./logos/okay-students.png"),
    loadLogo("./logos/gew.png"),
    loadLogo("./logos/wed.png"),
    loadLogo("./logos/meb-horizontal.png"),
    loadLogo("./logos/meb-vertical.png"),
    waitForFonts(),
  ]);
  state.logos = { okay, gew, wed, mebH, mebV };
  state.ready = true;
  renderPreview();
  updateText();
  syncPhotoControls();
  goToStep(1);
}

window.__WED__ = window.__GEW__ = {
  ready: () => state.ready,
  waitReady: () =>
    new Promise((resolve) => {
      const tick = () => (state.ready ? resolve() : setTimeout(tick, 40));
      tick();
    }),
  setStudent,
  loadPhotoFromUrl,
  setCrop,
  getState: () => ({
    ...studentFromState(),
    hasPhoto: Boolean(state.photo),
    step: state.step,
    crop: { ...state.crop },
  }),
  goToStep,
  getText: () => buildPublicationText(studentFromState()),
  exportPngBlob,
  renderPreview,
};

boot();
