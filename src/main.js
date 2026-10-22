import * as THREE from 'three';
import { gsap } from 'gsap';
import { createRenderer, createScene, createCamera, addLights, bindResize } from './core/scene';
import { createGltfLoader } from './core/loaders';
import { createCameraControls, flyToPose, CAMERA_POSES } from './features/camera/cameraController';
import { addBoardItems, SURFACE } from './features/board/boardLayout';
import { createBoardLinks } from './features/board/boardLinks';
import { loadWorldAndFolderTemplate } from './features/world/worldLoader';
import { createFolderClones } from './features/folders/folderSpawner';
import {
  spreadFolders, gatherFolders, openFolderAnimation, closeFolderAnimation, TABLE_Y, OPEN_LIFT, OPEN_SPOT
} from './features/folders/folderAnimations';
import { attachPages, setPagesVisible, renderPages } from './features/folders/folderPages';
import { PROJECTS } from './projects';
import { createFolderInteraction } from './features/folders/folderInteractions';
import './style.scss';

const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();
const controls = createCameraControls(camera, renderer.domElement);
addLights(scene);
bindResize(camera, renderer);

const gltfLoader = createGltfLoader();
const raycaster = new THREE.Raycaster();
const folders = [];
let fileHolderMesh = null;
let folderHover = null;
let boardLinks = null;
let foldersSpread = false;
let clickZones = [];
let view = 'overview';
document.body.dataset.view = view;

// body[data-view] also decides which invisible nav strips the CSS shows.
function goTo(name) {
  view = name;
  document.body.dataset.view = name;
  flyToPose(camera, controls, CAMERA_POSES[name]);
}

const folderClose = document.querySelector('.folder-close');
let openedFolder = null;

// Frames both pages of the opened folder (about 2.1 × 1.35) from almost straight above, for any window shape.
function openedFolderPose() {
  const spine = new THREE.Vector3(OPEN_SPOT.x, TABLE_Y + OPEN_LIFT, OPEN_SPOT.z + 0.53);
  const viewHeight = Math.max(1.35 / 0.85, 2.1 / 0.9 / camera.aspect);
  const distance = viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const position = spine.clone().add(new THREE.Vector3(0.14, 1, 0).normalize().multiplyScalar(distance));
  return { position: position.toArray(), target: spine.toArray() };
}

function openFolder(folderData) {
  folderHover?.clearHoveredFolder();
  openedFolder = folderData;
  view = 'folder';
  document.body.dataset.view = view;
  document.querySelector('.page__title').textContent = PROJECTS[folderData.index].title;
  attachPages(folderData);
  openFolderAnimation(folderData, () => setPagesVisible(true));
  flyToPose(camera, controls, openedFolderPose());
  folderClose.focus();
}

function closeFolder() {
  setPagesVisible(false);
  closeFolderAnimation(openedFolder);
  openedFolder = null;
  goTo('table');
}

folderClose.addEventListener('click', closeFolder);

// A board document flies up in front of the camera, then the PDF viewer takes its place.
const docViewer = document.querySelector('.doc-viewer');
const docFrame = docViewer.querySelector('.doc-viewer__frame');
const docDownload = docViewer.querySelector('.doc-viewer__download');
let openedDoc = null;

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
  const viewHeight = Math.max(h / 0.75, w / 0.85 / camera.aspect);
  const distance = viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const target = camera.position.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), distance);
  const tween = { duration: 0.7, ease: 'power2.inOut' };

  gsap.killTweensOf([object.position, object.rotation, object.scale]);
  gsap.timeline({ onComplete: showDocViewer })
    .to(object.position, { x: target.x, y: target.y, z: target.z, ...tween })
    .to(object.rotation, { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z, ...tween }, '<')
    .to(object.scale, { x: 1, y: 1, z: 1, ...tween }, '<');
}

function showDocViewer() {
  fitDocViewer();
  docFrame.src = `${openedDoc.doc.pdf}#view=FitH`;
  docDownload.href = openedDoc.doc.pdf;
  docDownload.download = openedDoc.doc.download;
  docViewer.hidden = false;
  docViewer.querySelector('.doc-viewer__close').focus();
}

function closeDoc() {
  const { doc, object } = openedDoc;
  openedDoc = null;
  docViewer.hidden = true;
  docFrame.src = 'about:blank';
  const tween = { duration: 0.6, ease: 'power2.inOut' };

  gsap.killTweensOf([object.position, object.rotation, object.scale]);
  gsap.timeline({ onComplete: () => { view = 'board'; document.body.dataset.view = view; } })
    .to(object.position, { x: SURFACE.x + doc.x, y: SURFACE.y + doc.y, z: object.userData.restZ, ...tween })
    .to(object.rotation, { x: 0, y: 0, z: doc.rot, ...tween }, '<');
}

docViewer.querySelector('.doc-viewer__close').addEventListener('click', closeDoc);
window.addEventListener('resize', () => openedDoc && !docViewer.hidden && fitDocViewer());

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  if (view === 'folder') {
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

// Overview: fly to whichever click zone the ray enters first.
// Table: a spread folder opens, the holder toggles the folders.
// Board: a badge opens its link, a document opens up close. Doc: a click outside closes it.
function onSceneClick() {
  if (view === 'board') {
    const hit = boardLinks?.itemAt(raycaster);
    if (hit?.item.url) {
      window.open(hit.item.url, '_blank', 'noopener');
    } else if (hit?.item.pdf) {
      openDoc(hit.item, hit.object);
    }
    return;
  }

  if (view === 'doc') {
    if (openedDoc && !docViewer.hidden) {
      closeDoc();
    }
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

const pointerDown = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (event) => pointerDown.set(event.clientX, event.clientY));
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

  addBoardItems(scene);
  boardLinks = createBoardLinks({
    scene,
    camera,
    isActive: () => view === 'board',
    onOpenDoc: openDoc
  });

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

  folders.push(...createFolderClones({
    template: folderTemplate,
    scene,
    numFolders: PROJECTS.length
  }));

  folderHover = createFolderInteraction({
    camera,
    folders,
    isActive: () => view === 'table',
    onHoverChange: showFolderLabel
  });
}

bootstrap();
animate();
window.scene = scene;
