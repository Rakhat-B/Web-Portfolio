import * as THREE from 'three';
import { gsap } from 'gsap';
import { revealScene } from './features/loading/loadingScreen';
import { createRenderer, createScene, createCamera, addLights, bindResize } from './core/scene';
import { createGltfLoader } from './core/loaders';
import { isPortrait, portraitQuery } from './core/layout';
import { setFrameSrc } from './core/frames';
import {
  createCameraControls, flyToPose, fitDistance, fitPose, CAMERA_POSES, PORTRAIT_VIEWS
} from './features/camera/cameraController';
import { SURFACE } from './features/board/boardLayout';
import { createBoardLinks, BOARD_NOTES } from './features/board/boardLinks';
import { createBoardLight } from './features/board/boardLight';
import { loadWorldAndFolderTemplate } from './features/world/worldLoader';
import { createFolderClones } from './features/folders/folderSpawner';
import {
  spreadFolders, gatherFolders, openFolderAnimation, closeFolderAnimation, snapFolderHome,
  TABLE_Y, OPEN_LIFT, OPEN_SPOT, OPEN_PAGES
} from './features/folders/folderAnimations';
import { createFolderRing, RING_BOUNDS } from './features/folders/folderRing';
import { attachPages, setPagesVisible, renderPages, fillPages, stopPageMedia } from './features/folders/folderPages';
import { PROJECTS } from './projects';
import { createFolderInteraction } from './features/folders/folderInteractions';
import { createMusicPlayer } from './features/music/musicPlayer';
import './style.scss';

const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();
const controls = createCameraControls(camera, renderer.domElement);
const { lamp } = addLights(scene);
const boardLight = createBoardLight(scene, lamp);
bindResize(camera, renderer);
createMusicPlayer();

const gltfLoader = createGltfLoader();
const raycaster = new THREE.Raycaster();
const folders = [];
let fileHolderMesh = null;
let folderHover = null;
let folderRing = null; // portrait Projects view
let boardLinks = null;
let foldersSpread = false;
let clickZones = [];
let overviewBoxes = []; // portrait: what the room view frames
let boardOrder = []; // portrait: board items left to right, the order the camera hops through them
let boardIndex = 0;
let view = 'loading'; // nothing to hover or click behind the loading screen
document.body.dataset.view = view;

// body[data-view] also decides which invisible nav strips the CSS shows.
// Portrait screens (core/layout.js) also bring the folder ring up in the desk view and hold
// a board item in focus in the board view.
function goTo(name, duration) {
  view = name;
  document.body.dataset.view = name;
  if (name === 'board') {
    boardLight.turnOn();
  } else {
    boardLight.turnOff();
  }
  if (isPortrait()) {
    if (name === 'table') {
      folderRing?.enter();
    } else {
      folderRing?.leave();
    }
    boardLinks?.focus(name === 'board' ? boardOrder[boardIndex] ?? null : null);
    if (name === 'board' && boardOrder.length) {
      showBoardLabel();
    }
  }
  flyToPose(camera, controls, poseFor(name), duration);
}

// Desktop views have fixed poses; portrait ones are fitted to the screen's shape.
function poseFor(name) {
  if (isPortrait() && name === 'overview' && overviewBoxes.length) {
    const pose = fitPose(camera, overviewBoxes, PORTRAIT_VIEWS.overview);
    const limits = { ...CAMERA_POSES.overview.limits, minDistance: pose.distance * 0.75, maxDistance: pose.distance * 1.5 };
    return { ...pose, limits };
  }
  if (isPortrait() && name === 'table' && folderRing) {
    return fitPose(camera, [RING_BOUNDS], PORTRAIT_VIEWS.ring);
  }
  if (isPortrait() && name === 'board' && boardOrder.length) {
    return boardItemPose(boardOrder[boardIndex]);
  }
  return CAMERA_POSES[name];
}

const folderClose = document.querySelector('.folder-close');
let openedFolder = null;

// Frames both pages of the opened folder (about 2.1 × 1.35) from almost straight above, for any window shape.
function openedFolderPose() {
  const spine = new THREE.Vector3(OPEN_SPOT.x, TABLE_Y + OPEN_LIFT, OPEN_SPOT.z + 0.53);
  const distance = fitDistance(camera, 2.1, 1.35, 0.9, 0.85);
  const position = spine.clone().add(new THREE.Vector3(0.14, 1, 0).normalize().multiplyScalar(distance));
  return { position: position.toArray(), target: spine.toArray() };
}

// Portrait: one page of the opened folder at a time; the arrows (.page-switch) fly between them.
const pageSwitch = document.querySelector('.page-switch');
const pageButtons = pageSwitch.querySelectorAll('.page-switch__step');
const pageDots = pageSwitch.querySelectorAll('.page-switch__dot');
let openedPage = 'left';

function showPage(side, duration = 0.7) {
  openedPage = side;
  pageButtons.forEach((button) => { button.disabled = button.dataset.page === side; });
  pageDots.forEach((dot) => dot.classList.toggle('is-current', dot.dataset.page === side));
  const page = new THREE.Box3().setFromCenterAndSize(OPEN_PAGES[side], new THREE.Vector3(1.15, 0.02, 0.85));
  flyToPose(camera, controls, fitPose(camera, [page], PORTRAIT_VIEWS.page), duration);
}

pageButtons.forEach((button) => button.addEventListener('click', () => showPage(button.dataset.page)));

function openFolder(folderData) {
  const project = PROJECTS[folderData.index];
  folderHover?.clearHoveredFolder();
  openedFolder = folderData;
  view = 'folder';
  document.body.dataset.view = view;
  fillPages(project, (doc) => openPdf(project, doc), { embedPdf: !isPortrait() });
  attachPages(folderData);
  if (isPortrait()) {
    folderRing.release(folderData);
  }
  openFolderAnimation(folderData, () => setPagesVisible(true));
  if (isPortrait()) {
    showPage('left', 1.2);
  } else {
    flyToPose(camera, controls, openedFolderPose());
  }
  folderClose.focus();
}

function closeFolder() {
  const folderData = openedFolder;
  closeViewer();
  stopPageMedia();
  setPagesVisible(false);
  // Portrait: once shut it flies back into the ring.
  closeFolderAnimation(folderData, isPortrait() ? () => folderRing.restore(folderData) : undefined);
  openedFolder = null;
  goTo('table');
}

folderClose.addEventListener('click', closeFolder);

// A board document or note flies up in front of the camera, then the viewer takes its place:
// a document's PDF, or a note's own drawing (crisp and unlit, away from the lamp it looks dim).
// Phones can't show a PDF inside the page, so on portrait screens a document shows its first
// page with a link to the PDF, and a note (too small to read as a drawing) shows its text.
const docViewer = document.querySelector('.doc-viewer');
const docFrame = docViewer.querySelector('.doc-viewer__frame');
const docDownload = docViewer.querySelector('.doc-viewer__download');
const docText = docViewer.querySelector('.doc-viewer__text');
const VIEWER_MODES = ['doc-viewer--centered', 'doc-viewer--slides', 'doc-viewer--image', 'doc-viewer--note', 'doc-viewer--text'];
let openedDoc = null;
let docMotion = null; // a board document flying up to the camera or back

function resetDocViewer() {
  docViewer.style.cssText = '';
  docViewer.classList.remove(...VIEWER_MODES);
}

// The viewer's link downloads the PDF; on portrait screens it opens it in a new tab instead,
// in the phone's own PDF viewer.
function setDocLink(pdf, filename) {
  docDownload.href = pdf;
  if (isPortrait()) {
    docDownload.textContent = 'Open PDF';
    docDownload.target = '_blank';
    docDownload.rel = 'noopener';
    docDownload.removeAttribute('download');
  } else {
    docDownload.textContent = 'Download';
    docDownload.removeAttribute('target');
    docDownload.download = filename;
  }
}

// A note's title, subtitle and paragraphs as real text (portrait).
function fillNoteText({ title, subtitle, lines }) {
  const make = (tag, className, text) => Object.assign(document.createElement(tag), { className, textContent: text });
  docText.replaceChildren(
    make('h2', 'doc-viewer__title', title),
    ...(subtitle ? [make('p', 'doc-viewer__subtitle', subtitle)] : []),
    ...lines.map((line) => make('p', '', line))
  );
  docText.scrollTop = 0;
}

// Covers exactly the sheet's on-screen rectangle, so the swap from 3D sheet to viewer is seamless.
function fitDocViewer() {
  const page = openedDoc.object.children[1];
  const xs = [];
  const ys = [];
  [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(([x, y]) => {
    const p = page.localToWorld(new THREE.Vector3(x, y, 0)).project(camera);
    xs.push((p.x + 1) / 2 * window.innerWidth);
    ys.push((1 - p.y) / 2 * window.innerHeight);
  });
  Object.assign(docViewer.style, {
    left: `${Math.min(...xs)}px`,
    top: `${Math.min(...ys)}px`,
    width: `${Math.max(...xs) - Math.min(...xs)}px`,
    height: `${Math.max(...ys) - Math.min(...ys)}px`
  });
}

function openDoc(doc, object) {
  boardLinks.clearHover();
  openedDoc = { doc, object };
  view = 'doc';
  document.body.dataset.view = view;

  // Fill ~75% of the height (or 85% of the width on narrow windows), facing the camera.
  const { w, h } = object.userData.size;
  const distance = fitDistance(camera, w, h, 0.85, 0.75);
  const target = camera.position.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), distance);
  const tween = { duration: 0.7, ease: 'power2.inOut' };

  docMotion?.kill();
  gsap.killTweensOf([object.position, object.rotation, object.scale]);
  docMotion = gsap.timeline({ onComplete: showDocViewer })
    .to(object.position, { x: target.x, y: target.y, z: target.z, ...tween })
    .to(object.rotation, { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z, ...tween }, '<')
    .to(object.scale, { x: 1, y: 1, z: 1, ...tween }, '<');
}

function showDocViewer() {
  const { doc, object } = openedDoc;
  resetDocViewer();
  if (isPortrait() && doc.note) {
    docViewer.classList.add('doc-viewer--centered', 'doc-viewer--text', 'doc-viewer--note');
    docViewer.style.backgroundColor = doc.background;
    fillNoteText(doc);
  } else {
    fitDocViewer();
    docViewer.classList.toggle('doc-viewer--image', !doc.pdf || isPortrait());
    docViewer.classList.toggle('doc-viewer--note', !doc.pdf);
    if (!doc.pdf) {
      docViewer.style.backgroundImage = `url(${object.children[1].material.map.image.toDataURL()})`;
    } else if (isPortrait()) {
      docViewer.style.backgroundImage = `url(${doc.image})`;
      setDocLink(doc.pdf, doc.download);
    } else {
      setFrameSrc(docFrame, `${doc.pdf}#view=FitH`);
      setDocLink(doc.pdf, doc.download);
    }
  }
  docViewer.hidden = false;
  docViewer.querySelector('.doc-viewer__close').focus();
}

function closeDoc() {
  const { doc, object } = openedDoc;
  openedDoc = null;
  docViewer.hidden = true;
  setFrameSrc(docFrame, 'about:blank');
  const tween = { duration: 0.6, ease: 'power2.inOut' };

  docMotion?.kill(); // still flying up
  gsap.killTweensOf([object.position, object.rotation, object.scale]);
  docMotion = gsap.timeline({
    onComplete: () => {
      view = 'board';
      document.body.dataset.view = view;
      if (isPortrait()) {
        boardLinks.focus(object); // lifted again, as before it opened
      }
    }
  })
    .to(object.position, { x: SURFACE.x + doc.x, y: SURFACE.y + doc.y, z: object.userData.restZ, ...tween })
    .to(object.rotation, { x: 0, y: 0, z: doc.rot, ...tween }, '<');
}

// One of an opened folder's documents: the same viewer, centred on screen (nothing flies up).
// Portrait screens open it in a new tab instead.
function openPdf(project, doc) {
  if (isPortrait()) {
    window.open(doc.pdf, '_blank', 'noopener');
    return;
  }
  resetDocViewer();
  docViewer.classList.add('doc-viewer--centered');
  setFrameSrc(docFrame, `${doc.pdf}#view=FitH`);
  setDocLink(doc.pdf, `${project.title}_${doc.title}.pdf`.replace(/[^\w.]+/g, '_'));
  docViewer.hidden = false;
  docViewer.querySelector('.doc-viewer__close').focus();
}

// An opened folder's slides, big and 16:9 in the same viewer (no download).
// Portrait screens open the player in a new tab, where it can fill the phone turned sideways.
function openSlides(project) {
  if (isPortrait()) {
    window.open(project.slides, '_blank', 'noopener');
    return;
  }
  resetDocViewer();
  docViewer.classList.add('doc-viewer--centered', 'doc-viewer--slides');
  setFrameSrc(docFrame, project.slides);
  docViewer.hidden = false;
  docViewer.querySelector('.doc-viewer__close').focus();
}

// "Full view" buttons on the opened folder's pages.
document.querySelector('.page__expand--pdf').addEventListener('click', () => {
  const project = openedFolder && PROJECTS[openedFolder.index];
  if (project?.documents?.[0]) {
    openPdf(project, project.documents[0]);
  }
});
document.querySelector('.page__expand--slides').addEventListener('click', () => {
  const project = openedFolder && PROJECTS[openedFolder.index];
  if (project?.slides) {
    openSlides(project);
  }
});

// Board documents fly back on close; a project's document just disappears.
function closeViewer() {
  if (openedDoc) {
    closeDoc();
  } else if (!docViewer.hidden) {
    docViewer.hidden = true;
    setFrameSrc(docFrame, 'about:blank');
  }
}

docViewer.querySelector('.doc-viewer__close').addEventListener('click', closeViewer);
window.addEventListener('resize', () => {
  if (openedDoc && !docViewer.hidden && !docViewer.classList.contains('doc-viewer--centered')) {
    fitDocViewer();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  if (view === 'folder' && !docViewer.hidden) {
    closeViewer(); // the document first, then the folder on the next Esc
  } else if (view === 'folder') {
    closeFolder();
  } else if (view === 'doc' && openedDoc) {
    closeDoc();
  }
});

const holderButton = document.querySelector('.hotspot--holder');

function toggleFolders() {
  if (!folders.length || folders.some((folderData) => folderData.isAnimating)) {
    return;
  }
  folderHover?.clearHoveredFolder(); // otherwise the hovered folder later "un-hovers" back to its old height
  foldersSpread = !foldersSpread;
  (foldersSpread ? spreadFolders : gatherFolders)(folders);
  holderButton.querySelector('.tip').textContent = foldersSpread ? 'Hide Projects' : 'Show Projects';
}

holderButton.addEventListener('click', toggleFolders);

// Portrait carousels (the folder ring, the board items): the name of the one in front, with
// what a tap does, in the bar along the bottom.
const carouselLabel = document.querySelector('.carousel-bar__label');
const carouselName = carouselLabel.querySelector('.carousel-bar__name');
const carouselHint = carouselLabel.querySelector('.carousel-bar__hint');

function setCarouselLabel(name, hint) {
  carouselName.textContent = name;
  carouselHint.textContent = hint;
  carouselLabel.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 250, easing: 'ease-out' });
}

function showBoardLabel() {
  const { item } = boardOrder[boardIndex].userData;
  const hint = item.url?.startsWith('mailto:') ? 'Tap to email'
    : item.url ? 'Tap to visit'
      : item.pdf || item.note ? 'Tap to open' : '';
  setCarouselLabel(item.label, hint);
}

// Portrait: the board item in focus head-on, with a little of its neighbours round it.
function boardItemPose(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  size.set(Math.max(size.x * 1.35, 1.3), size.y * 1.35, size.z);
  return fitPose(camera, [box.setFromCenterAndSize(box.getCenter(new THREE.Vector3()), size)], PORTRAIT_VIEWS.boardItem);
}

// Portrait: hop the camera to board item `index` (wrapping round) and lift it.
function focusBoardItem(index) {
  boardIndex = (index + boardOrder.length) % boardOrder.length;
  boardLinks.focus(boardOrder[boardIndex]);
  showBoardLabel();
  flyToPose(camera, controls, boardItemPose(boardOrder[boardIndex]), 0.7);
}

function stepCarousel(direction) {
  if (view === 'table') {
    folderRing?.step(direction);
  } else if (view === 'board' && boardOrder.length) {
    focusBoardItem(boardIndex + direction);
  }
}

document.querySelectorAll('.carousel-bar__step').forEach((button) => {
  button.addEventListener('click', () => stepCarousel(Number(button.dataset.step)));
});

// A badge opens its link, a document or note opens up close.
function activateBoardItem({ item, object }) {
  if (item.url?.startsWith('mailto:')) {
    window.location.href = item.url; // hands off to the mail app without a blank tab
  } else if (item.url) {
    window.open(item.url, '_blank', 'noopener');
  } else if (item.pdf || item.note) {
    openDoc(item, object);
  }
}

// Overview: fly to whichever click zone the ray enters first.
// Table: a spread folder opens, the holder toggles the folders.
// Board: a badge opens its link, a document or note opens up close. Doc: a click outside closes it.
// Portrait: on the ring the front folder opens and another spins round to the front; on the
// board the focused item opens and another gets the focus.
function onSceneClick() {
  if (isPortrait() && view === 'table') {
    const folder = folderRing && raycaster.intersectObjects(folders.map((folderData) => folderData.hoverCollider))
      .map(({ object }) => object.userData.folderRef)
      .find((folderData) => folderRing.isTappable(folderData));
    if (folder && folderRing.isFront(folder)) {
      openFolder(folder);
    } else if (folder) {
      folderRing.bringToFront(folder);
    }
    return;
  }

  if (isPortrait() && view === 'board') {
    const hit = boardLinks?.itemAt(raycaster);
    if (hit && hit.object === boardOrder[boardIndex]) {
      activateBoardItem(hit);
    } else if (hit) {
      focusBoardItem(boardOrder.indexOf(hit.object));
    }
    return;
  }

  if (view === 'board') {
    const hit = boardLinks?.itemAt(raycaster);
    if (hit) {
      activateBoardItem(hit);
    }
    return;
  }

  if (view === 'doc') {
    if (openedDoc && !docViewer.hidden) {
      closeDoc();
    }
    return;
  }

  if (view === 'folder') {
    closeViewer(); // a click outside an open document closes it
    return;
  }

  if (view === 'overview') {
    const zone = clickZones
      .map(({ box, view: zoneView }) => ({ zoneView, point: raycaster.ray.intersectBox(box, new THREE.Vector3()) }))
      .filter(({ point }) => point)
      .sort((a, b) => a.point.distanceTo(camera.position) - b.point.distanceTo(camera.position))[0];
    if (zone) {
      goTo(zone.zoneView);
    }
    return;
  }

  if (view === 'table' && fileHolderMesh) {
    const clickedFolder = foldersSpread
      ? raycaster.intersectObjects(folders.map((folderData) => folderData.hoverCollider))[0]?.object.userData.folderRef
      : null;
    if (clickedFolder && !clickedFolder.isAnimating) {
      openFolder(clickedFolder);
      return;
    }

    const hits = raycaster.intersectObjects(scene.children, true);
    if (hits.some(({ object }) => object === fileHolderMesh || object.userData.type === 'folderTrigger')) {
      toggleFolders();
    }
  }
}

// Portrait: a drag on the ring spins it; a sideways swipe on the board hops to the next item
// (swipe left) or the previous one (swipe right).
const pointerDown = new THREE.Vector2();
let swipeFrom = null;
renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown.set(event.clientX, event.clientY);
  if (isPortrait() && view === 'table') {
    folderRing?.grab(event.clientX);
  }
  swipeFrom = isPortrait() && view === 'board' ? { x: event.clientX, y: event.clientY } : null;
});
window.addEventListener('pointermove', (event) => folderRing?.move(event.clientX));
window.addEventListener('pointerup', (event) => {
  folderRing?.drop();
  if (!swipeFrom) {
    return;
  }
  const dx = event.clientX - swipeFrom.x;
  const dy = event.clientY - swipeFrom.y;
  swipeFrom = null;
  if (view === 'board' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    focusBoardItem(boardIndex + (dx < 0 ? 1 : -1));
  }
});
window.addEventListener('pointercancel', () => {
  folderRing?.drop();
  swipeFrom = null;
});
renderer.domElement.addEventListener('click', (event) => {
  if (pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) {
    return; // that was an orbit drag, not a click
  }
  raycaster.setFromCamera(new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  ), camera);
  onSceneClick();
});

// Portrait carousels from the keyboard too (narrow desktop windows): arrows step, Enter opens.
window.addEventListener('keydown', (event) => {
  if (!isPortrait() || event.target.matches?.('input')) {
    return; // the volume slider has its own arrow keys
  }
  const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
  if (direction && view === 'folder') {
    const side = direction < 0 ? 'left' : 'right';
    if (side !== openedPage) {
      showPage(side);
    }
  } else if (direction) {
    stepCarousel(direction);
  } else if (event.key === 'Enter' && event.target === document.body) {
    const front = folderRing?.front();
    if (view === 'table' && front && folderRing.isTappable(front)) {
      openFolder(front);
    } else if (view === 'board' && boardOrder.length) {
      activateBoardItem({ item: boardOrder[boardIndex].userData.item, object: boardOrder[boardIndex] });
    }
  }
});

// Rotating the phone (or resizing a window past square) switches layouts: close whatever is
// open, put everything back in its place, and carry on from the same view in the other layout.
portraitQuery.addEventListener('change', () => {
  if (view === 'loading') {
    return; // the reveal picks the right layout
  }
  const nextView = { folder: 'table', doc: 'board' }[view] ?? view;
  docMotion?.kill();
  openedDoc = null;
  docViewer.hidden = true;
  setFrameSrc(docFrame, 'about:blank');
  if (openedFolder) {
    stopPageMedia();
    setPagesVisible(false);
    openedFolder = null;
  }
  folderHover?.clearHoveredFolder();
  folderRing?.reset();
  folders.forEach(snapFolderHome);
  foldersSpread = false;
  holderButton.querySelector('.tip').textContent = 'Show Projects';
  boardLinks?.reset();
  goTo(nextView);
});

document.querySelectorAll('[data-goto]').forEach((button) => {
  button.addEventListener('click', () => goTo(button.dataset.goto));
});

// Hotspots sit over a 3D point: their data-anchor, or else the point their view looks at.
const hotspots = [...document.querySelectorAll('.hotspot')].map((el) => ({
  el,
  point: new THREE.Vector3(...(el.dataset.anchor?.split(' ').map(Number) ?? CAMERA_POSES[el.dataset.goto].target))
}));
const projected = new THREE.Vector3();

// Project name over the hovered folder; it keeps its last folder while fading out.
const folderLabel = document.querySelector('.screen-label--folder');
let labelledFolder = null;

function showFolderLabel(folderData) {
  const show = Boolean(folderData) && foldersSpread;
  folderLabel.classList.toggle('is-shown', show);
  if (show) {
    labelledFolder = folderData;
    folderLabel.querySelector('.tip').textContent = PROJECTS[folderData.index].title;
  }
}

// Board item labels hang just under their item.
const linkLabelPoint = new THREE.Vector3();

function placeOnScreen(el, point) {
  projected.copy(point).project(camera);
  el.style.left = `${(projected.x + 1) * 50}%`;
  el.style.top = `${(1 - projected.y) * 50}%`;
}

function placeHotspots() {
  hotspots.forEach(({ el, point }) => placeOnScreen(el, point));
  if (labelledFolder) {
    placeOnScreen(folderLabel, labelledFolder.mesh.position);
  }
  boardLinks?.objects.forEach((object) => {
    placeOnScreen(object.userData.label, linkLabelPoint.copy(object.position).setY(object.position.y - object.userData.labelOffset));
  });
}

// Dev only: 1/2/3 fly between views, "p" logs the current view for CAMERA_POSES.
if (import.meta.env.DEV) {
  const poseKeys = { 1: 'overview', 2: 'table', 3: 'board' };
  const round = (v) => v.toArray().map((n) => +n.toFixed(2));
  window.addEventListener('keydown', (event) => {
    if (poseKeys[event.key]) goTo(poseKeys[event.key]);
    if (event.key === 'p') {
      console.log(`{ position: ${JSON.stringify(round(camera.position))}, target: ${JSON.stringify(round(controls.target))} }`);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  folderRing?.update(performance.now() / 1000);
  placeHotspots();
  renderer.render(scene, camera);
  renderPages(scene, camera);
}

async function bootstrap() {
  const { folderTemplate } = await loadWorldAndFolderTemplate({
    gltfLoader,
    scene,
    onFileHolderFound: (mesh) => {
      fileHolderMesh = mesh;
    }
  });

  boardLinks = createBoardLinks({
    scene,
    camera,
    isActive: () => view === 'board' && !isPortrait(),
    onOpenDoc: openDoc
  });

  // Portrait: left to right (top first where two share a column), starting on About Me.
  boardOrder = [...boardLinks.objects].sort((a, b) => (
    a.userData.item.x - b.userData.item.x || b.userData.item.y - a.userData.item.y
  ));
  boardIndex = Math.max(0, boardOrder.findIndex((object) => object.userData.item === BOARD_NOTES[0]));

  if (!folderTemplate || !fileHolderMesh) {
    return;
  }

  // "Around the table" = table, lamp and holder together, down to the floor.
  const boxOf = (...names) => names.reduce((box, name) => box.expandByObject(scene.getObjectByName(name)), new THREE.Box3());
  const tableZone = boxOf('table', 'Lamp', 'fileHolder');
  tableZone.min.y = 1.08; // floor height
  clickZones = [
    { view: 'table', box: tableZone },
    { view: 'board', box: boxOf('board') }
  ];

  // Portrait room view: the desk with its lamp and holder, and most of the board (its right
  // end may run off a phone's narrow screen, so the room can sit closer).
  const boardPart = boxOf('board');
  boardPart.max.x = SURFACE.x + 0.8;
  overviewBoxes = [boxOf('table', 'Lamp', 'fileHolder'), boardPart];

  folders.push(...createFolderClones({
    template: folderTemplate,
    scene,
    numFolders: PROJECTS.length
  }));

  folderHover = createFolderInteraction({
    camera,
    folders,
    isActive: () => view === 'table' && !isPortrait(),
    onHoverChange: showFolderLabel
  });

  folderRing = createFolderRing({
    folders,
    onFrontChange: (folderData) => setCarouselLabel(PROJECTS[folderData.index].title, 'Tap to open')
  });
}

// Shaders compile before the reveal, so the first frames of the glide into overview don't stutter.
bootstrap()
  .then(() => renderer.compileAsync(scene, camera))
  .then(() => revealScene(() => goTo('overview', 2.4)));
animate();
window.scene = scene;
