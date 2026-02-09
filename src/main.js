import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

// Lights — emulate a high-end desk lamp
const ambient = new THREE.AmbientLight(0xffffff, 0.15); // reduced ambient for more dramatic effect
scene.add(ambient);

// Main lamp: PointLight for localized desk-lamp effect with shadows
const lamp = new THREE.PointLight(0xfff7e8, 150, 15, 2); // warm color, high intensity, distance=15, decay=2 (physically correct)
lamp.position.set(-3.5, 6.5, -2.1); // exact bulb position
lamp.castShadow = true;
lamp.shadow.camera.near = 0.1;
lamp.shadow.camera.far = 15;
lamp.shadow.mapSize.set(2048, 2048);
lamp.shadow.bias = -0.001;
scene.add(lamp);

// Fill light: faint PointLight to soften harsh shadows (no shadows cast)
const fillLight = new THREE.PointLight(0xffffff, 20, 15, 2); // low intensity, same position
fillLight.position.set(-3.5, 6.5, -2.1);
fillLight.castShadow = false; // no shadows to avoid pitch-black holes
scene.add(fillLight);

// Visual helper: small sphere to show lamp position (remove this later)
const lampHelper = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffff00 })
);
lampHelper.position.copy(lamp.position);
scene.add(lampHelper);

// GLTF + DRACO loader setup
const dracoLoader = new DRACOLoader();
// Use public DRACO decoders (CDN). If you host decoders locally, change this path.
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Load the room + table (served from Vite's /public folder as '/models/world_scene.glb')
const WORLD_URL = '/models/world_scene.glb';
gltfLoader.load(
  WORLD_URL,
  (gltf) => {
    const root = gltf.scene || gltf.scenes[0];
    if (!root) {
      console.warn('GLTF loaded but contains no scene graph:', gltf);
      return;
    }

    // Ensure the world model (table, room) receives shadows and casts them if needed
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;  // objects in the room can cast shadows
        child.receiveShadow = true; // the table/floor receives shadows
        // ensure correct color space for materials using textures
        if (child.material && child.material.map) child.material.map.encoding = THREE.sRGBEncoding;
      }
    });

    scene.add(root);
    console.log('Loaded world_scene:', gltf);
    
    // NOTE: When you add folder clones later, ensure each folder mesh has:
    // - castShadow = true
    // - receiveShadow = true
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
import './style.scss'