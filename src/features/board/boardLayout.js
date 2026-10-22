import * as THREE from 'three';

// Centre of the board's cork surface (measured from the model), cards sit just in front.
export const SURFACE = { x: 0.29, y: 6.935, z: -4.745 };

// Placeholder cards in cork-local units (cork is 5.24 × 2.85, origin at its centre).
// Kept clear of the left and bottom nav strips in the board view. Colors become images later.
// boardLinks.js adds the GitHub and LinkedIn badges (where the first two link notes were)
// and the diploma, IELTS and resume sheets (where the diploma and two picture cards were).
const BOARD_ITEMS = [
  { name: 'photo', x: -1.55, y: 0.35, w: 0.95, h: 1.25, rot: 0.03, color: 0xc9d6df },
  { name: 'bio', x: -0.05, y: 0.45, w: 1.7, h: 1.1, rot: -0.01, color: 0xfffaf0 },
  { name: 'picture1', x: -1.6, y: -0.8, w: 0.8, h: 0.6, rot: -0.04, color: 0xb0c4b1 },
  { name: 'link3', x: 1.3, y: -0.95, w: 0.42, h: 0.42, rot: -0.04, color: 0xffd54f },
  { name: 'link4', x: 1.85, y: -0.95, w: 0.42, h: 0.42, rot: 0.02, color: 0xffd54f }
];

export function addBoardItems(scene) {
  BOARD_ITEMS.forEach(({ name, x, y, w, h, rot, color }) => {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color }));
    card.name = name;
    card.position.set(SURFACE.x + x, SURFACE.y + y, SURFACE.z);
    card.rotation.z = rot;
    card.receiveShadow = true;
    scene.add(card);
  });
}
