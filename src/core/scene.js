import * as THREE from 'three';

export function createRenderer() {
  // alpha: transparent clear, so the CSS gradient on <body> shows around the room.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

export function createScene() {
  return new THREE.Scene();
}

export function createCamera() {
  return new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
}

export function addLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  const lamp = new THREE.PointLight(0xfff7e8, 50, 15, 2);
  lamp.position.set(-3.5, 6.5, -2.1);
  lamp.castShadow = true;
  lamp.shadow.camera.near = 0.1;
  lamp.shadow.camera.far = 15;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.001;
  scene.add(lamp);

  const fillLight = new THREE.PointLight(0xffffff, 20, 15, 2);
  fillLight.position.set(-3.5, 6.5, -2.1);
  fillLight.castShadow = false;
  scene.add(fillLight);
}

export function bindResize(camera, renderer) {
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', onWindowResize, false);

  return () => {
    window.removeEventListener('resize', onWindowResize, false);
  };
}
