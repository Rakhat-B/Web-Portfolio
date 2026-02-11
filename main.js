import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3); // slightly above the desk, a comfortable inspection distance

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;

// Lights — emulate a desk lamp
const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xfff7e8, 1.0); // warm lamp-like color
dir.position.set(1, 2, 1);
dir.castShadow = true;
dir.shadow.camera.near = 0.1;
dir.shadow.camera.far = 10;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

// GLTF + DRACO loader setup
const dracoLoader = new DRACOLoader();
// Use public DRACO decoders (CDN). If you host decoders locally, change this path.
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Load the room + table (served from Vite's /public folder as '/world_scene.glb')
const WORLD_URL = '/world_scene.glb';
gltfLoader.load(
  WORLD_URL,
  (gltf) => {
    const root = gltf.scene || gltf.scenes[0];
    if (!root) {
      console.warn('GLTF loaded but contains no scene graph:', gltf);
      return;
    }

    // Optional: a small adjust so the model sits nicely in view
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // ensure correct color space for materials using textures
        if (child.material && child.material.map) child.material.map.encoding = THREE.sRGBEncoding;
      }
    });

    scene.add(root);
    console.log('Loaded world_scene:', gltf);
  },
  (progress) => {
    if (progress.total) {
      console.log(`world_scene.glb ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
    }
  },
  (err) => {
    console.error('Error loading world_scene.glb', err);
  }
);

// Resize handling
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

// Expose scene for debugging in the console (optional)
window.scene = scene;
