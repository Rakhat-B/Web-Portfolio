import * as THREE from 'three';
import { gsap } from 'gsap';
import { gatherFolders } from './folderAnimations';

// Portrait Projects view: the folders float in a ring over the desk, like the Silent Hill 2
// inventory. The camera looks at it from +x (PORTRAIT_VIEWS.ring); the front folder faces it and
// sways, the rest stand round the circle facing out. Dragging spins the ring and letting go settles
// the nearest folder at the front. main.js decides when it shows and what a tap does.
const RING_CENTRE = new THREE.Vector3(-2.7, 5.95, 0.25); // over the desk, clear of the lamp and holder
const RING_RADIUS = 1.45;
// What the camera frames: the circle, with room for the front folder's size and drift.
export const RING_BOUNDS = new THREE.Box3(
  new THREE.Vector3(RING_CENTRE.x - RING_RADIUS - 0.1, RING_CENTRE.y - 0.85, RING_CENTRE.z - RING_RADIUS - 0.2),
  new THREE.Vector3(RING_CENTRE.x + RING_RADIUS + 0.15, RING_CENTRE.y + 0.85, RING_CENTRE.z + RING_RADIUS + 0.2)
);
const FRONT_SCALE = 1.2;
const BACK_SCALE = 0.75;
const BOB = 0.035; // how far each folder drifts up and down
const SWAY = 0.22; // radians the front folder turns either way
const RISE_Y = 6.4; // flying in, a folder first rises to here: out of the holder (top 5.67), off the desk
const RISE_SHARE = 0.3; // of the flight
const FLY_IN = 1; // seconds per folder
const STAGGER = 0.07;
const MAX_FLING = 3; // folders a quick flick can spin past

const UP = new THREE.Vector3(0, 1, 0);
// Standing as in the holder, cover towards +z; a quarter turn more faces it to the camera.
const STANDING = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const smooth = (u) => u * u * (3 - 2 * u);
const wrap = (i, count) => ((i % count) + count) % count;

export function createFolderRing({ folders, onFrontChange }) {
  const count = folders.length;
  const step = (Math.PI * 2) / count;
  // `blend` flies a folder from `from` (where it was) to its slot; `show` shrinks it away while another is open.
  const entries = folders.map((folder) => ({ folder, from: null, blend: { value: 1 }, show: { value: 1 }, free: false }));
  const turn = { value: 0 }; // ring position in folders: folder i is at the front when it equals i
  let target = 0; // what `turn` is settling to
  let active = false;
  let frontIndex = -1;
  let drag = null;

  const slotPosition = new THREE.Vector3();
  const slotQuaternion = new THREE.Quaternion();
  const risen = new THREE.Vector3();

  // Folder i's place on the ring right now (into slotPosition/slotQuaternion); returns its scale.
  function placeSlot(i, time) {
    const angle = (i - turn.value) * step; // 0 at the front, growing towards the screen's right
    const frontness = (Math.cos(angle) + 1) / 2; // 1 at the front, 0 at the back
    slotPosition.set(
      RING_CENTRE.x + Math.cos(angle) * RING_RADIUS,
      RING_CENTRE.y + Math.sin(time * 1.4 + i * 0.8) * BOB,
      RING_CENTRE.z - Math.sin(angle) * RING_RADIUS
    );
    const sway = Math.sin(time * 0.9) * SWAY * frontness ** 6;
    slotQuaternion.setFromAxisAngle(UP, Math.PI / 2 + angle + sway).multiply(STANDING);
    return THREE.MathUtils.lerp(BACK_SCALE, FRONT_SCALE, frontness ** 2);
  }

  const snapshot = ({ position, quaternion, scale }) => ({
    position: position.clone(), quaternion: quaternion.clone(), scale: scale.x
  });

  function update(time) {
    if (!active) {
      return;
    }
    const index = wrap(Math.round(turn.value), count);
    if (index !== frontIndex) {
      frontIndex = index;
      onFrontChange(folders[index]);
    }

    entries.forEach((entry, i) => {
      if (entry.free) {
        return; // opening: folderAnimations moves it
      }
      const { mesh } = entry.folder;
      const scale = placeSlot(i, time) * entry.show.value;
      const flight = entry.blend.value;
      if (flight >= 1) {
        mesh.position.copy(slotPosition);
        mesh.quaternion.copy(slotQuaternion);
        mesh.scale.setScalar(Math.max(scale, 0.001));
        return;
      }

      // Flying in: straight up first, then over to its slot, turning on the way.
      const { from } = entry;
      risen.copy(from.position).setY(Math.max(from.position.y + 0.5, RISE_Y));
      if (flight < RISE_SHARE) {
        mesh.position.lerpVectors(from.position, risen, smooth(flight / RISE_SHARE));
        return;
      }
      const u = smooth((flight - RISE_SHARE) / (1 - RISE_SHARE));
      mesh.position.lerpVectors(risen, slotPosition, u);
      mesh.quaternion.slerpQuaternions(from.quaternion, slotQuaternion, u);
      mesh.scale.setScalar(THREE.MathUtils.lerp(from.scale, scale, u));
    });
  }

  function settle(value, duration = 0.55) {
    target = value;
    gsap.to(turn, { value, duration, ease: 'power3.out', overwrite: true });
  }

  // Folders lift out of wherever they are (the holder) and fly into the ring, one after another.
  function enter() {
    if (active) {
      return;
    }
    active = true;
    frontIndex = -1;
    entries.forEach((entry, i) => {
      const { mesh } = entry.folder;
      gsap.killTweensOf([mesh.position, mesh.rotation, mesh.scale]); // e.g. still flying home
      mesh.visible = true;
      Object.assign(entry, { free: false, from: snapshot(mesh) });
      entry.show.value = 1;
      entry.blend.value = 0;
      gsap.to(entry.blend, { value: 1, duration: FLY_IN, delay: 0.3 + i * STAGGER, ease: 'none', overwrite: true });
    });
  }

  // Back into the holder: up, across and down, as on desktop.
  function leave() {
    if (!active) {
      return;
    }
    active = false;
    drag = null;
    gsap.killTweensOf(turn);
    entries.forEach((entry) => {
      const { mesh } = entry.folder;
      gsap.killTweensOf([entry.blend, entry.show]);
      entry.free = false;
      mesh.visible = true;
      gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'power2.inOut' });
    });
    gatherFolders(folders);
  }

  // Stop driving the folders at once (the layout switched); main.js puts them back.
  function reset() {
    active = false;
    drag = null;
    gsap.killTweensOf(turn);
    entries.forEach((entry) => {
      gsap.killTweensOf([entry.blend, entry.show]);
      entry.free = false;
      entry.blend.value = 1;
      entry.show.value = 1;
    });
  }

  // `folder` is opening: let it go to full size, and shrink the others away.
  function release(folder) {
    entries.forEach((entry) => {
      const { mesh } = entry.folder;
      if (entry.folder === folder) {
        entry.free = true;
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'power2.inOut' });
      } else {
        gsap.to(entry.show, {
          value: 0, duration: 0.4, ease: 'power2.in', overwrite: true, onComplete: () => { mesh.visible = false; }
        });
      }
    });
  }

  // The opened folder has shut: fly it back to its slot, and bring the others back.
  function restore(folder) {
    entries.forEach((entry) => {
      const { mesh } = entry.folder;
      if (entry.folder === folder) {
        Object.assign(entry, { free: false, from: snapshot(mesh) });
        entry.blend.value = 0;
        gsap.to(entry.blend, { value: 1, duration: FLY_IN, ease: 'none', overwrite: true });
      } else {
        mesh.visible = true;
        gsap.to(entry.show, { value: 1, duration: 0.5, delay: 0.3, ease: 'power2.out', overwrite: true });
      }
    });
  }

  const entryOf = (folder) => entries[folders.indexOf(folder)];

  // Only a folder resting on the ring answers a tap (raycasts also hit hidden ones).
  function isTappable(folder) {
    const entry = entryOf(folder);
    return active && Boolean(entry) && !entry.free && entry.blend.value >= 1 && entry.show.value >= 1;
  }

  // The shortest way round to put `folder` at the front.
  function bringToFront(folder) {
    const base = Math.round(target);
    let offset = wrap(folders.indexOf(folder) - base, count);
    if (offset > count / 2) {
      offset -= count;
    }
    settle(base + offset);
  }

  // Dragging: the ring follows the finger (a drag of perFolder px turns it one folder), and a
  // quick flick carries on a little before settling.
  const perFolder = () => window.innerWidth / 2.5;

  function grab(x) {
    if (!active) {
      return;
    }
    gsap.killTweensOf(turn);
    drag = { x, time: performance.now(), velocity: 0 };
  }

  function move(x) {
    if (!drag) {
      return;
    }
    const now = performance.now();
    const dx = x - drag.x;
    turn.value -= dx / perFolder(); // dragging right brings the folders on the left round to the front
    target = turn.value;
    drag.velocity = drag.velocity * 0.3 + (dx / Math.max(now - drag.time, 1)) * 1000 * 0.7; // px/s
    drag.x = x;
    drag.time = now;
  }

  function drop() {
    if (!drag) {
      return;
    }
    const heldStill = performance.now() - drag.time > 120;
    const fling = heldStill ? 0 : THREE.MathUtils.clamp((-drag.velocity * 0.12) / perFolder(), -MAX_FLING, MAX_FLING);
    drag = null;
    settle(Math.round(turn.value + fling), 0.6);
  }

  return {
    update,
    enter,
    leave,
    reset,
    release,
    restore,
    isTappable,
    isFront: (folder) => active && folders.indexOf(folder) === frontIndex,
    front: () => folders[frontIndex],
    step: (direction) => settle(Math.round(target) + direction),
    bringToFront,
    grab,
    move,
    drop
  };
}
