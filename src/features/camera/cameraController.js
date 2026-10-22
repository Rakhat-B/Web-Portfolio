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
  board: { position: [0.01, 7.1, -0.82], target: [0.29, 6.97, -4.88] }
};

export function setCameraPose(camera, controls, pose) {
  const { position, target, limits } = pose;
  camera.position.set(...position);
  controls.target.set(...target);
  Object.assign(controls, NO_LIMITS, limits);
  controls.enabled = Boolean(limits);
}

let flight = null;

// Smoothly moves camera and look-at point together, then locks in the pose.
export function flyToPose(camera, controls, pose) {
  const { position, target } = pose;
  const tween = { duration: 1.2, ease: 'power2.inOut' };

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
  setCameraPose(camera, controls, CAMERA_POSES.overview);
  return controls;
}
