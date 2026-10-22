import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

// Draws the .page elements (index.html) in 3D on top of the WebGL canvas.
const cssRenderer = new CSS3DRenderer();
cssRenderer.domElement.className = 'css3d';
document.body.appendChild(cssRenderer.domElement);
const resize = () => cssRenderer.setSize(window.innerWidth, window.innerHeight);
resize();
window.addEventListener('resize', resize);

// .page elements are 600 × 810 css px; this makes them 0.85 × 1.15 world units.
const PAGE_SCALE = 0.85 / 600;

function makePage(selector, rotationY, position) {
  const page = new CSS3DObject(document.querySelector(selector));
  page.scale.setScalar(PAGE_SCALE);
  page.rotation.y = rotationY;
  page.position.set(...position);
  page.visible = false;
  return page;
}

// In both folder parts x is the thickness (up when lying on the table), y runs along the
// spine and z across the page; the cover hinges at its own origin.
const leftPage = makePage('.page--left', -Math.PI / 2, [-0.005, 0, -0.49]); // inside of the front cover
const rightPage = makePage('.page--right', Math.PI / 2, [0.02, 0, 0]); // on the back, under the cover

export function attachPages(folderData) {
  folderData.mesh.getObjectByName('frontSide').add(leftPage);
  folderData.mesh.getObjectByName('backSide').add(rightPage);
}

export function setPagesVisible(visible) {
  leftPage.visible = visible;
  rightPage.visible = visible;
}

export function renderPages(scene, camera) {
  cssRenderer.render(scene, camera);
}
