import * as THREE from 'three';
import { gsap } from 'gsap';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { SURFACE } from './boardLayout';

// Interactive items pinned to the board, in cork-local units (see boardLayout.js):
// link badges open a URL, documents open their PDF up close (main.js).
export const BOARD_LINKS = [
  { icon: 'github', url: 'https://github.com/Rakhat-B', label: 'git/Rakhat-B', x: 1.3, y: -0.45 },
  { icon: 'linkedin', url: 'https://www.linkedin.com/in/rakhat-bektas66', label: 'rakhat-bektas66', x: 1.85, y: -0.45 }
];

// Documents pinned to the board as images (page 1 of each PDF, see public/docs/). Each image
// is fitted into its w × h box keeping its own shape; clicking opens the PDF up close.
export const BOARD_DOCS = [
  { pdf: '/docs/diploma.pdf', image: '/docs/diploma.jpg', download: 'Rakhat_Bektas_Diploma.pdf', label: "Bachelor's Diploma", x: 1.65, y: 0.5, w: 1.45, h: 1.05, rot: -0.02 },
  { pdf: '/docs/ielts.pdf', image: '/docs/ielts.jpg', download: 'Rakhat_Bektas_IELTS.pdf', label: 'IELTS Certificate', x: -0.65, y: -0.75, w: 0.62, h: 0.88, rot: 0.02 },
  { pdf: '/docs/resume.pdf', image: '/docs/resume.jpg', download: 'Rakhat_Bektas_Resume.pdf', label: 'Resume', x: 0.3, y: -0.75, w: 0.62, h: 0.88, rot: -0.02 }
];

// Each icon is a logo whose symbol is cut out of its outline (`size` × `size` SVG units),
// extruded in `color`, with a white `backing` plate sunk behind so the symbol shows white.
const ICONS = {
  // Octicon "mark-github" (MIT): a disc with the Octocat cut out.
  github: {
    size: 16,
    color: 0x111111,
    backing: (s) => new THREE.CircleGeometry(7.6 * s, 48),
    path: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z'
  },
  // Simple Icons "linkedin" (CC0): a rounded square with "in" cut out.
  linkedin: {
    size: 24,
    color: 0x0a66c2,
    backing: (s) => new THREE.PlaneGeometry(21 * s, 21 * s),
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.71 1.637-1.452 3.37-1.452 3.601 0 4.267 2.37 4.267 4.892v6.251zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
  }
};

const PUCK_SIZE = 0.42; // world units across
const THICKNESS = 0.06; // world units, plus a bevel on each face
const BEVEL = 0.0066;
const HOVER_FLOAT = 0.05; // how far it lifts off the cork
const MAX_TILT = 0.3; // radians, when the cursor is at the rim

// Extruded logo with its white plate behind. Its front face sits at z = 0, its back on the cork.
function makePuck({ size, color, backing, path }) {
  const s = PUCK_SIZE / size; // SVG units -> world units
  const svg = `<svg viewBox="0 0 ${size} ${size}"><path d="${path}"/></svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((p) => SVGLoader.createShapes(p));
  const shell = new THREE.ExtrudeGeometry(shapes, {
    depth: THICKNESS / s, bevelEnabled: true, bevelThickness: BEVEL / s, bevelSize: 0.0053 / s, bevelSegments: 3, curveSegments: 32
  });
  // Centre it, then turn it over (not mirror) so SVG's downward y points up and the
  // bevelled face looks out of the board.
  shell.translate(-size / 2, -size / 2, BEVEL / s);
  shell.rotateX(Math.PI);
  shell.scale(s, s, s);

  const shellMesh = new THREE.Mesh(shell, new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.1 }));
  const plate = new THREE.Mesh(backing(s), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 }));
  plate.position.z = -0.03;

  const puck = new THREE.Group();
  puck.add(shellMesh, plate);
  puck.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return puck;
}

// A sheet of paper showing the document's first page, with a thin off-white edge.
// It starts at its box size and is resized to the image's shape once that loads.
function makeDoc(doc) {
  const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9 });
  const pageMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paperMaterial);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pageMaterial);
  page.position.z = 0.002;

  const sheet = new THREE.Group();
  sheet.add(paper, page);
  sheet.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const setSize = (w, h) => {
    page.scale.set(w, h, 1);
    paper.scale.set(w + 0.03, h + 0.03, 1);
    sheet.userData.size = { w, h };
    sheet.userData.halfWidth = w / 2;
    // A sheet lies almost flat on the cork: tilt only as far as its corners stay in front of it.
    sheet.userData.maxTilt = Math.min(MAX_TILT, HOVER_FLOAT / (w / 2 + h / 2));
    sheet.userData.labelOffset = h / 2 + 0.07;
  };
  setSize(doc.w, doc.h);

  new THREE.TextureLoader().load(doc.image, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    pageMaterial.map = texture;
    pageMaterial.needsUpdate = true;
    const aspect = texture.image.width / texture.image.height;
    setSize(Math.min(doc.w, doc.h * aspect), Math.min(doc.h, doc.w / aspect));
  });
  return sheet;
}

// Label under a board item; it is also its keyboard-reachable link (a doc's opens the PDF).
// main.js positions it.
function makeLabel({ url, pdf, label }) {
  const el = document.createElement('a');
  el.className = 'screen-label screen-label--link';
  el.href = url ?? pdf;
  el.target = '_blank';
  el.rel = 'noopener';
  el.innerHTML = '<span class="tip"></span>';
  el.firstChild.textContent = label;
  document.body.appendChild(el);
  return el;
}

export function createBoardLinks({ scene, camera, isActive, onOpenDoc }) {
  const puckZ = SURFACE.z + THICKNESS + 2 * BEVEL;
  const docZ = SURFACE.z + 0.01;

  function place(object, item, restZ) {
    object.position.set(SURFACE.x + item.x, SURFACE.y + item.y, restZ);
    object.rotation.z = item.rot ?? 0;
    object.userData.item = item;
    object.userData.restZ = restZ;
    object.userData.label = makeLabel(item);
    scene.add(object);
    return object;
  }

  const objects = [
    ...BOARD_LINKS.map((link) => {
      const puck = place(makePuck(ICONS[link.icon]), link, puckZ);
      puck.userData.halfWidth = PUCK_SIZE / 2;
      puck.userData.labelOffset = 0.26;
      return puck;
    }),
    ...BOARD_DOCS.map((doc) => {
      const sheet = place(makeDoc(doc), doc, docZ);
      // A click on a doc's label opens the viewer; the href stays for keyboard/new-tab use.
      sheet.userData.label.addEventListener('click', (event) => {
        if (event.detail > 0) {
          event.preventDefault();
          onOpenDoc(doc, sheet);
        }
      });
      return sheet;
    })
  ];

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const centre = new THREE.Vector3();
  const rim = new THREE.Vector3();
  let hovered = null;

  const objectAt = (ray) => ray.intersectObjects(objects, true)[0]?.object.parent ?? null;

  function setHovered(object) {
    if (object === hovered) {
      return;
    }
    if (hovered) {
      hovered.userData.label.classList.remove('is-shown');
      gsap.to(hovered.position, { z: hovered.userData.restZ, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(hovered.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(hovered.rotation, { x: 0, y: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    }
    hovered = object;
    if (hovered) {
      hovered.userData.label.classList.add('is-shown');
      gsap.to(hovered.position, { z: hovered.userData.restZ + HOVER_FLOAT, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(hovered.scale, { x: 1.03, y: 1.03, z: 1.03, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    }
    document.body.style.cursor = hovered ? 'pointer' : '';
  }

  // Tilt so the side under the cursor presses in, like a card held in the hand.
  function tiltTowards(event) {
    centre.copy(hovered.position).project(camera);
    rim.copy(hovered.position).setX(hovered.position.x + hovered.userData.halfWidth).project(camera);
    const radiusPx = Math.max(1, (rim.x - centre.x) * window.innerWidth / 2);
    const dx = THREE.MathUtils.clamp((event.clientX - (centre.x + 1) * window.innerWidth / 2) / radiusPx, -1, 1);
    const dy = THREE.MathUtils.clamp((event.clientY - (1 - centre.y) * window.innerHeight / 2) / radiusPx, -1, 1);
    const tilt = hovered.userData.maxTilt ?? MAX_TILT;
    gsap.to(hovered.rotation, { x: dy * tilt, y: dx * tilt, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  }

  window.addEventListener('mousemove', (event) => {
    if (!isActive()) {
      setHovered(null);
      return;
    }
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    setHovered(objectAt(raycaster));
    if (hovered) {
      tiltTowards(event);
    }
  });

  return {
    objects,
    itemAt(ray) {
      const object = objectAt(ray);
      return object ? { item: object.userData.item, object } : null;
    },
    // Drop the hover state at once, without the settle-back tweens (the caller animates the object).
    clearHover() {
      if (hovered) {
        hovered.userData.label.classList.remove('is-shown');
        hovered = null;
        document.body.style.cursor = '';
      }
    }
  };
}
