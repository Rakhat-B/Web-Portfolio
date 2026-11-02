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

// Puts a project from src/projects.js on the pages; missing pieces are hidden.
// The first document is shown on the right page; `onOpenPdf(doc)` runs when one of the
// others' links is clicked. Without `embedPdf` (phones can't show a PDF inside the page) the
// right page shows a card that opens the first document the same way instead.
export function fillPages(project, onOpenPdf, { embedPdf = true } = {}) {
  const $ = (selector) => document.querySelector(selector);
  $('.page__title').textContent = project.title;
  $('.page__description').textContent = project.description || 'Description coming soon.';

  const audio = $('.page__audio');
  audio.hidden = !project.audio;
  if (project.audio) {
    audio.src = project.audio;
  } else {
    audio.removeAttribute('src');
  }

  // The main document fills the right page; the others are links under "More documents".
  const [mainDoc, ...extraDocs] = project.documents ?? [];
  $('.page__pdf-wrap').hidden = !mainDoc || !embedPdf;
  $('.page__pdf-empty').hidden = Boolean(mainDoc);
  $('.page__pdf').src = mainDoc && embedPdf ? `${mainDoc.pdf}#toolbar=0&view=FitH` : 'about:blank';

  const pdfCard = $('.page__pdf-card');
  pdfCard.hidden = !mainDoc || embedPdf;
  if (mainDoc) {
    pdfCard.querySelector('.page__pdf-card-title').textContent = `Read the ${mainDoc.title}`;
    pdfCard.onclick = () => onOpenPdf(mainDoc);
  }

  const docList = $('.page__docs');
  docList.hidden = !extraDocs.length;
  docList.replaceChildren(...extraDocs.flatMap((doc, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'page__doc';
    button.textContent = `Read the ${doc.title} (PDF)`;
    button.addEventListener('click', () => onOpenPdf(doc));
    if (i !== 0) {
      return [button];
    }
    const caption = document.createElement('p');
    caption.className = 'page__docs-caption';
    caption.textContent = 'More documents:';
    return [caption, button];
  }));
  const github = $('.page__github');
  github.hidden = !project.github;
  github.href = project.github || '';

  $('.page__slides-wrap').hidden = !project.slides;
  $('.page__slides').src = project.slides || 'about:blank';
}

// Stops the voice-over and the slides' videos, and unloads the PDF, when the folder closes.
export function stopPageMedia() {
  document.querySelector('.page__audio').pause();
  document.querySelector('.page__slides').src = 'about:blank';
  document.querySelector('.page__pdf').src = 'about:blank';
}

export function renderPages(scene, camera) {
  cssRenderer.render(scene, camera);
}
