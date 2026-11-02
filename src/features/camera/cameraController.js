import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

// OrbitControls defaults, reset on every pose change.
const NO_LIMITS = {
  minDistance: 0,
  maxDistance: Infinity,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity
};

// Press "p" in dev to log the current view in this format.
// Poses with `limits` can be orbited within them; poses without are locked.
export const CAMERA_POSES = {
  overview: {
    position: [11.83, 13.73, 11.3],
    target: [-2, 3, -2],
    limits: {
      minDistance: 14,
      maxDistance: 26,
      minPolarAngle: Math.PI / 6, // 30° from straight down
      maxPolarAngle: Math.PI * 0.42, // ~75°, stays above the floor
      minAzimuthAngle: 0, // keep to the open corner of the room
      maxAzimuthAngle: Math.PI / 2
    }
  },
  table: { position: [0.66, 10.68, -0.01], target: [-2.83, 4.08, -0.11] },
  board: { position: [0.01, 7.1, -0.82], target: [0.29, 6.97, -4.88] },
  // Behind the loading screen: further out and a little round, so the reveal glides into overview.
  intro: { position: [10.5, 17.5, 19.5], target: [-2, 3, -2] }
};

// Unit vector from a target towards the camera: `azimuth` round from +z towards +x, `polar` down from straight above.
const fromAngles = (azimuth, polar) => new THREE.Vector3(
  Math.sin(polar) * Math.sin(azimuth), Math.cos(polar), Math.sin(polar) * Math.cos(azimuth)
);

// Portrait screens (core/layout.js) frame things to fit the screen instead of using fixed poses.
// main.js says what to frame; these give the viewing direction, how much of the screen
// (0..1 from the centre to each edge) it may fill, and how far up the screen it's lifted to
// clear the controls along the bottom. Each view is fitted once, when the camera heads there.
export const PORTRAIT_VIEWS = {
  // The room, a little more from the front than on desktop so the desk and board sit closer.
  overview: { direction: fromAngles(0.3, 1), fillX: 1, fillY: 0.6, raise: 0.3 },
  // The folder ring over the desk, seen from the open side of the room.
  ring: { direction: new THREE.Vector3(Math.cos(0.4), Math.sin(0.4), 0), fillX: 1, fillY: 0.6, raise: 0.1 },
  // One page of the opened folder, from almost straight above like the desktop's two-page view.
  page: { direction: new THREE.Vector3(0.14, 1, 0).normalize(), fillX: 0.94, fillY: 0.78, raise: 0.1 },
  // One item on the board, head-on.
  boardItem: { direction: new THREE.Vector3(0, 0.08, 1).normalize(), fillX: 1, fillY: 0.7, raise: 0.1 }
};

// Distance at which a width × height box facing the camera fills at most fillW of the
// screen's width and fillH of its height.
export function fitDistance(camera, width, height, fillW = 1, fillH = 1) {
  const viewHeight = Math.max(height / fillH, width / fillW / camera.aspect);
  return viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
}

const probe = new THREE.PerspectiveCamera();
const corner = new THREE.Vector3();

// Pose looking at the boxes' common centre from `direction`, at the nearest distance where every
// corner stays inside fillX × fillY of the screen. `raise` then lifts the framed boxes up the
// screen by that fraction of its half-height. Returns the pose and the distance it settled on.
export function fitPose(camera, boxes, { direction, fillX = 1, fillY = 1, raise = 0 }) {
  const centre = boxes.reduce((all, box) => all.union(box), new THREE.Box3()).getCenter(new THREE.Vector3());
  probe.fov = camera.fov;
  probe.aspect = window.innerWidth / window.innerHeight; // the camera may not have caught up with a rotation yet
  probe.near = camera.near;
  probe.far = camera.far;
  probe.updateProjectionMatrix();

  const aim = (distance) => {
    probe.position.copy(centre).addScaledVector(direction, distance);
    probe.lookAt(centre);
    probe.updateMatrixWorld();
  };
  const fits = (distance) => {
    aim(distance);
    return boxes.every((box) => [0, 1, 2, 3, 4, 5, 6, 7].every((i) => {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      corner.applyMatrix4(probe.matrixWorldInverse);
      if (-corner.z < probe.near) {
        return false; // behind the camera
      }
      corner.applyMatrix4(probe.projectionMatrix);
      return Math.abs(corner.x) <= fillX && Math.abs(corner.y) <= fillY;
    }));
  };

  // Once far enough, every corner stays in: halve the gap between too near and far enough.
  let near = 0.1;
  let far = 200;
  for (let i = 0; i < 40; i++) {
    const mid = (near + far) / 2;
    if (fits(mid)) {
      far = mid;
    } else {
      near = mid;
    }
  }

  // Moving camera and target down the screen's up-axis lifts what they frame.
  aim(far);
  const lift = new THREE.Vector3(0, 1, 0).applyQuaternion(probe.quaternion)
    .multiplyScalar(-raise * far * Math.tan(THREE.MathUtils.degToRad(probe.fov / 2)));
  return {
    position: probe.position.clone().add(lift).toArray(),
    target: centre.add(lift).toArray(),
    distance: far
  };
}

export function setCameraPose(camera, controls, pose) {
  const { position, target, limits } = pose;
  camera.position.set(...position);
  controls.target.set(...target);
  Object.assign(controls, NO_LIMITS, limits);
  controls.enabled = Boolean(limits);
}

let flight = null;

// Smoothly moves camera and look-at point together, then locks in the pose.
export function flyToPose(camera, controls, pose, duration = 1.2) {
  const { position, target } = pose;
  const tween = { duration, ease: 'power2.inOut' };

  flight?.kill(); // a new click mid-flight takes over from wherever we are
  Object.assign(controls, NO_LIMITS); // so controls.update() can't clamp mid-flight
  controls.enabled = false;

  flight = gsap.timeline({ onComplete: () => setCameraPose(camera, controls, pose) })
    .to(camera.position, { x: position[0], y: position[1], z: position[2], ...tween })
    .to(controls.target, { x: target[0], y: target[1], z: target[2], ...tween }, '<');
}

export function createCameraControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  setCameraPose(camera, controls, CAMERA_POSES.intro);
  return controls;
}
