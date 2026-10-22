import { gsap } from 'gsap';

// Table top is y = 4.08; folders are 0.035 thick.
export const TABLE_Y = 4.1;
// An opened folder rises this much so its cover clears the neighbouring folders.
export const OPEN_LIFT = 0.3;
// Where a folder slides to before opening: the open folder (z -1.13..0.91) clears the holder and lamp.
export const OPEN_SPOT = { x: -2.3, z: -0.6 };
// Travel height: a standing folder (1.32 tall) clears the holder top (5.67).
const LIFT_Y = 6.5;
const STAGGER = 0.08;

// One spot per folder, in table-camera reading order: far row left→right, then
// near row. Measured to clear the lamp (far right) and the holder (left end).
// yaw is a small tilt on top of π/2, which faces the folder to the table camera.
export const FOLDER_SLOTS = [
  { x: -3.35, z: 1.6, yaw: -0.07 },
  { x: -3.35, z: 0.35, yaw: 0.05 },
  { x: -3.35, z: -0.9, yaw: -0.03 },
  { x: -1.75, z: 2.0, yaw: 0.06 },
  { x: -1.75, z: 0.82, yaw: -0.08 },
  { x: -1.75, z: -0.36, yaw: 0.03 },
  { x: -1.75, z: -1.54, yaw: -0.05 },
  { x: -1.75, z: -2.72, yaw: 0.04 }
];

// Up, across, then drop: folders never pass through the table or the holder.
function moveFolder(folderData, position, rotation, delay) {
  const { mesh } = folderData;
  gsap.killTweensOf(mesh.position); // drop any hover lift still running
  folderData.isAnimating = true;

  gsap.timeline({ delay, onComplete: () => { folderData.isAnimating = false; } })
    .to(mesh.position, { y: LIFT_Y, duration: 0.35, ease: 'power2.out' })
    .to(mesh.position, { x: position.x, z: position.z, duration: 0.5, ease: 'power1.inOut' })
    .to(mesh.rotation, { x: rotation.x, y: rotation.y, z: rotation.z, duration: 0.5, ease: 'power1.inOut' }, '<')
    .to(mesh.position, { y: position.y, duration: 0.4, ease: 'power2.in' });
}

export function spreadFolders(folders) {
  folders.forEach((folderData, i) => {
    const slot = FOLDER_SLOTS[i];
    moveFolder(folderData, { x: slot.x, y: TABLE_Y, z: slot.z }, { x: 0, y: (Math.PI / 2) + slot.yaw, z: 0 }, i * STAGGER);
  });
}

export function gatherFolders(folders) {
  folders.forEach((folderData, i) => {
    moveFolder(folderData, folderData.homePosition, folderData.homeRotation, i * STAGGER);
  });
}

// Lift and slide to the open spot squared up to the camera, then swing the front cover open around the spine.
export function openFolderAnimation(folderData, onOpened) {
  const { mesh } = folderData;
  const cover = mesh.getObjectByName('frontSide');
  gsap.killTweensOf([mesh.position, mesh.rotation, cover.rotation]);
  folderData.isAnimating = true;

  gsap.timeline({ onComplete: () => { folderData.isAnimating = false; onOpened(); } })
    .to(mesh.position, { x: OPEN_SPOT.x, y: TABLE_Y + OPEN_LIFT, z: OPEN_SPOT.z, duration: 0.6, ease: 'power2.inOut' })
    .to(mesh.rotation, { y: Math.PI / 2, duration: 0.6, ease: 'power2.inOut' }, '<')
    .to(cover.rotation, { y: -Math.PI, duration: 0.8, ease: 'power2.inOut' });
}

export function closeFolderAnimation(folderData) {
  const { mesh } = folderData;
  const cover = mesh.getObjectByName('frontSide');
  const slot = FOLDER_SLOTS[folderData.index];
  gsap.killTweensOf([mesh.position, mesh.rotation, cover.rotation]);
  folderData.isAnimating = true;

  gsap.timeline({ onComplete: () => { folderData.isAnimating = false; } })
    .to(cover.rotation, { y: 0, duration: 0.6, ease: 'power2.inOut' })
    .to(mesh.position, { x: slot.x, y: TABLE_Y, z: slot.z, duration: 0.6, ease: 'power2.inOut' })
    .to(mesh.rotation, { y: (Math.PI / 2) + slot.yaw, duration: 0.6, ease: 'power2.inOut' }, '<');
}
