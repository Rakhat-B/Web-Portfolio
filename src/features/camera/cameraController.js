import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createCameraControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(-2, 3, -2);
  controls.enableDamping = true;
  return controls;
}
