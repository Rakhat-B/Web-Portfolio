import * as THREE from 'three';
import { gsap } from 'gsap';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { SURFACE } from './boardLayout';
import { ABOUT } from '../../about';

// Interactive items pinned to the board, in cork-local units (see boardLayout.js):
// link badges open a URL, documents open their PDF up close and notes fly up to be read (main.js).
export const BOARD_LINKS = [
  { icon: 'github', url: 'https://github.com/Rakhat-B', label: 'git/Rakhat-B', x: 1.3, y: -0.45 },
  { icon: 'linkedin', url: 'https://www.linkedin.com/in/rakhat-bektas66', label: 'rakhat-bektas66', x: 1.85, y: -0.45 },
  { icon: 'email', url: `mailto:${ABOUT.email}`, label: ABOUT.email, x: 1.3, y: -0.95 }
];

// Notes drawn from src/about.js: `lines` are paragraphs (`gap` apart, in font sizes).
export const BOARD_NOTES = [
  {
    note: true, margin: 0, label: 'About Me', x: -0.05, y: 0.45, w: 1.7, h: 1.1, rot: -0.01,
    background: '#fffaf0', title: ABOUT.name, subtitle: ABOUT.role, lines: ABOUT.bio, gap: 0.6
  },
  {
    note: true, margin: 0, label: 'Skills', x: -1.6, y: -0.8, w: 0.8, h: 0.6, rot: -0.04,
    background: '#ffe27a', title: 'Skills', lines: ABOUT.skills.map((skill) => `• ${skill}`), gap: 0
  }
];

// Polaroid: the picture is w × h, framed by `margin` with a deeper `bottomMargin`.
const BOARD_PHOTO = {
  image: ABOUT.photo, label: ABOUT.name, x: -1.55, y: 0.4, w: 0.85, h: 0.95, rot: 0.03,
  paperColor: 0xfbfbf8, margin: 0.05, bottomMargin: 0.25, cover: true
};

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
  },
  // A rounded square with an envelope cut out: its flap and body, split by the V of the fold.
  // The holes wind the other way round from the square.
  email: {
    size: 24,
    color: 0xc0392b,
    backing: (s) => new THREE.PlaneGeometry(21 * s, 21 * s),
    path: 'M2.5 0h19A2.5 2.5 0 0 1 24 2.5v19a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 0 21.5v-19A2.5 2.5 0 0 1 2.5 0z' +
      'M5.25 6.5L12 11.5625L18.75 6.5z' +
      'M4 7.4375V17.5H20V7.4375L12 13.4375z'
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

// A sheet of paper showing an image (a document's first page, a photo) or a drawn `texture`,
// framed by its paper edge. The image is fitted into its w × h box keeping its shape (the
// sheet resizes once it loads), or with `cover` cropped to fill the box.
function makeSheet({ image, w, h, paperColor = 0xf4f1ea, margin = 0.015, bottomMargin = margin, cover = false }, texture) {
  const paperMaterial = new THREE.MeshStandardMaterial({ color: paperColor, roughness: 0.9 });
  const pageMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paperMaterial);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pageMaterial);
  page.position.z = 0.002;
  paper.position.y = (margin - bottomMargin) / 2;

  const sheet = new THREE.Group();
  sheet.add(paper, page);
  sheet.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const setSize = (pageW, pageH) => {
    const fullW = pageW + 2 * margin;
    const fullH = pageH + margin + bottomMargin;
    page.scale.set(pageW, pageH, 1);
    paper.scale.set(fullW, fullH, 1);
    sheet.userData.size = { w: pageW, h: pageH };
    sheet.userData.halfWidth = fullW / 2;
    // A sheet lies almost flat on the cork: tilt only as far as its corners stay in front of it.
    sheet.userData.maxTilt = Math.min(MAX_TILT, HOVER_FLOAT / (fullW / 2 + fullH / 2));
    sheet.userData.labelOffset = pageH / 2 + bottomMargin + 0.055;
  };
  setSize(w, h);

  const show = (map) => {
    map.colorSpace = THREE.SRGBColorSpace;
    pageMaterial.map = map;
    pageMaterial.needsUpdate = true;
    const ratio = (map.image.width / map.image.height) / (w / h); // > 1: wider than the box
    if (cover) {
      map.repeat.set(Math.min(1, 1 / ratio), Math.min(1, ratio));
      map.offset.set((1 - map.repeat.x) / 2, (1 - map.repeat.y) / 2);
    } else {
      setSize(Math.min(w, w * ratio), Math.min(h, h / ratio));
    }
  };
  if (texture) {
    show(texture);
  } else {
    new THREE.TextureLoader().load(image, show);
  }
  return sheet;
}

const NOTE_PX = 1024; // canvas px per world unit: sharp even when a note is flown up close
const NOTE_FONT = 'Georgia, "Times New Roman", serif';

function wrapText(ctx, text, maxWidth) {
  const rows = [''];
  text.split(' ').forEach((word) => {
    const row = rows[rows.length - 1];
    const next = row ? `${row} ${word}` : word;
    if (row && ctx.measureText(next).width > maxWidth) {
      rows.push(word);
    } else {
      rows[rows.length - 1] = next;
    }
  });
  return rows;
}

// Rows of text (with baselines) for a note at body font `size` px.
function layoutNote(ctx, { title, subtitle, lines, gap }, size, maxWidth) {
  const rows = [];
  let y = 0;
  const add = (text, font, lineHeight) => {
    ctx.font = font;
    wrapText(ctx, text, maxWidth).forEach((row) => {
      y += lineHeight;
      rows.push({ text: row, font, y: y - lineHeight * 0.28 });
    });
  };
  if (title) add(title, `bold ${size * 1.6}px ${NOTE_FONT}`, size * 2);
  if (subtitle) add(subtitle, `italic ${size}px ${NOTE_FONT}`, size * 1.4);
  y += size * 0.5;
  lines.forEach((line, i) => {
    y += i ? size * gap : 0;
    add(line, `${size}px ${NOTE_FONT}`, size * 1.4);
  });
  return { rows, height: y };
}

// A note's paper with its text drawn on, shrinking the text until it fits.
function makeNoteTexture(note) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(note.w * NOTE_PX);
  canvas.height = Math.round(note.h * NOTE_PX);
  const ctx = canvas.getContext('2d');
  const pad = 0.08 * NOTE_PX;
  const maxWidth = canvas.width - 2 * pad;

  let size = 0.05 * NOTE_PX;
  let layout = layoutNote(ctx, note, size, maxWidth);
  while (layout.height > canvas.height - 2 * pad && size > 12) {
    size *= 0.92;
    layout = layoutNote(ctx, note, size, maxWidth);
  }

  ctx.fillStyle = note.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2a2a2a';
  layout.rows.forEach(({ text, font, y }) => {
    ctx.font = font;
    ctx.fillText(text, pad, pad + y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8; // three.js caps it at what the GPU supports
  return texture;
}

// Stands in on the polaroid until ABOUT.photo is set.
const photoPlaceholder = () => makeNoteTexture({
  w: BOARD_PHOTO.w, h: BOARD_PHOTO.h, background: '#c9d6df', title: 'Photo', lines: ['Set ABOUT.photo in src/about.js'], gap: 0
});

// Label under a board item, and its keyboard-reachable control: a link for badges and docs
// (a doc's opens the PDF), a button for notes, plain text for the photo. main.js positions it.
function makeLabel({ url, pdf, note, label }) {
  const href = url ?? pdf;
  const el = document.createElement(href ? 'a' : note ? 'button' : 'div');
  el.className = 'screen-label screen-label--link';
  if (href) {
    el.href = href;
    if (!href.startsWith('mailto:')) {
      el.target = '_blank';
      el.rel = 'noopener';
    }
  }
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
    place(makeSheet(BOARD_PHOTO, BOARD_PHOTO.image ? null : photoPlaceholder()), BOARD_PHOTO, docZ),
    ...[...BOARD_DOCS, ...BOARD_NOTES].map((item) => {
      const sheet = place(makeSheet(item, item.note ? makeNoteTexture(item) : null), item, docZ);
      // A click on a doc's label opens the viewer (the href stays for keyboard/new-tab use);
      // a note's label always opens it up close.
      sheet.userData.label.addEventListener('click', (event) => {
        if (item.note || event.detail > 0) {
          event.preventDefault();
          onOpenDoc(item, sheet);
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
