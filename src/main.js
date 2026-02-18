import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { gsap } from 'gsap';

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
camera.position.set(0, 6, 8); // pulled back and higher to see more of the scene

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-2, 3, -2); // Look at where the folders are (-2.25, 4.70, -2.10)
controls.enableDamping = true;

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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

// GLTF + DRACO loader setup
const dracoLoader = new DRACOLoader();
// Use public DRACO decoders (CDN). If you host decoders locally, change this path.
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Data structures for interactive folders
const folders = []; // Array to store folder clones with metadata { mesh, isAnimating, ... }
let fileHolderMesh = null; // Reference to the purple holder mesh from world_scene

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
      
      // Find the purple file holder mesh by name
      if (child.name === 'fileHolder') {
        fileHolderMesh = child;
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);
        console.log('Found fileHolder:');
        console.log('  Local position:', `x:${child.position.x.toFixed(2)}, y:${child.position.y.toFixed(2)}, z:${child.position.z.toFixed(2)}`);
        console.log('  World position:', `x:${worldPos.x.toFixed(2)}, y:${worldPos.y.toFixed(2)}, z:${worldPos.z.toFixed(2)}`);
        console.log('  Rotation:', `x:${child.rotation.x.toFixed(2)}, y:${child.rotation.y.toFixed(2)}, z:${child.rotation.z.toFixed(2)}`);
        
        // Create invisible clickable sphere at folder holder position
        const clickSphere = new THREE.Mesh(
          new THREE.SphereGeometry(1, 16, 16), // 1.5 radius sphere (MUCH bigger)
          new THREE.MeshBasicMaterial({ 
            color: 0xff00ff, 
            transparent: true, 
            opacity: 0, // INVISIBLE - working!
            depthTest: true, // Changed to true for proper raycasting
            wireframe: false, // Solid sphere for better raycasting
            side: THREE.DoubleSide // Raycast both sides
          })
        );
        clickSphere.position.set(-2.5, 5, 2.7); // Center of folders
        clickSphere.userData.isClickable = true;
        clickSphere.userData.type = 'folderTrigger';
        scene.add(clickSphere);
        console.log('✅ Created invisible click sphere (radius 1.5) at folder holder position');
      }
    });

    scene.add(root);
    console.log('Loaded world_scene:', gltf);
    
    // After world loads, load the folder template
    loadFolderTemplate();
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

// Load folder_template.glb and create 5 clones
function loadFolderTemplate() {
  const FOLDER_URL = '/models/folder_template.glb';
  gltfLoader.load(
    FOLDER_URL,
    (gltf) => {
      const folderTemplate = gltf.scene || gltf.scenes[0];
      if (!folderTemplate) {
        console.warn('folder_template.glb loaded but contains no scene');
        return;
      }
      
      console.log('Loaded folder_template:', gltf);
      
      // Create 5 clones and position them vertically in the fileHolder
      createFolderClones(folderTemplate);
    },
    (progress) => {
      if (progress.total) {
        console.log(`folder_template.glb ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
      }
    },
    (err) => {
      console.error('Error loading folder_template.glb', err);
    }
  );
}

// Create 5 folder clones and position them vertically in the fileHolder
function createFolderClones(template) {
  if (!fileHolderMesh) {
    console.warn('fileHolder not found, cannot position folders');
    return;
  }
  
  // Get world position of the fileHolder
  const holderWorldPos = new THREE.Vector3();
  fileHolderMesh.getWorldPosition(holderWorldPos);
  
  console.log('FileHolder world position:', `x:${holderWorldPos.x.toFixed(2)}, y:${holderWorldPos.y.toFixed(2)}, z:${holderWorldPos.z.toFixed(2)}`);
  
  // ===== ADJUST THESE VALUES TO POSITION FOLDERS =====
  const START_X = -2.25;      // Starting X position (left/right)
  const START_Y = 4.7;      // Starting Y position (up/down)
  const START_Z = -2.1;       // Starting Z position (forward/back)
  
  // Spacing between folders - when folders are VERTICAL, they need spacing along X or Z axis
  const SPACING_X = 0.0;     // Spacing along X axis (left/right between folders)
  const SPACING_Y = 0.0;     // Spacing along Y axis (up/down between folders)
  const SPACING_Z = 0.03;     // Spacing along Z axis (forward/back between folders) - USE THIS for vertical folders
  
  // Rotation to make folders vertical (standing up)
  const ROTATION_X = Math.PI / 2;  // Rotate 90° around X axis (0 = flat, Math.PI/2 = vertical)
  const ROTATION_Y = 0;            // Rotate around Y axis
  const ROTATION_Z = 0;            // Rotate around Z axis
  // ====================================================
  
  const NUM_FOLDERS = 10; // CHANGE THIS to test with more/fewer folders (5, 10, 15, etc.)
  
  for (let i = 0; i < NUM_FOLDERS; i++) {
    // Clone the template
    const folderClone = template.clone();
    
    // Position with slot-like offsets (now spaced along Z axis for vertical folders)
    folderClone.position.set(
      START_X + (i * SPACING_X),
      START_Y + (i * SPACING_Y),
      START_Z + (i * SPACING_Z)  // spacing along Z for vertical folders in a row
    );
    
    // Set rotation to make folders vertical
    folderClone.rotation.set(ROTATION_X, ROTATION_Y, ROTATION_Z);
    
    // Set shadow properties on all meshes in the folder
    folderClone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material && child.material.map) {
          child.material.map.encoding = THREE.sRGBEncoding;
        }
      }
    });
    
    // Add to scene
    scene.add(folderClone);
    
    // Store in folders array with metadata
    folders.push({
      mesh: folderClone,
      isAnimating: false,
      index: i
    });
    
    // Log each folder's position for debugging
    const fpos = folderClone.position;
    console.log(`Folder ${i} position: x:${fpos.x.toFixed(2)}, y:${fpos.y.toFixed(2)}, z:${fpos.z.toFixed(2)}`);
  }
  
  console.log(`Created ${NUM_FOLDERS} folder clones`);
  console.log('Folders array:', folders);
  console.log('Helper spheres:', folders.map(f => f.helper));
}

// Resize handling
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Click event listener for folder interaction
window.addEventListener('click', onMouseClick, false);

function onMouseClick(event) {
  // Convert screen coordinates to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Handle folder click detection
  handleFolderClick();
}

// Detect which folder was clicked and trigger animation
function handleFolderClick() {
  // Update raycaster with camera and mouse position
  raycaster.setFromCamera(mouse, camera);
  
  console.log('🖱️ Click detected! Mouse:', mouse.x.toFixed(2), mouse.y.toFixed(2));
  console.log('Camera position:', camera.position);
  
  // Check if the folder holder was clicked
  if (!fileHolderMesh) {
    console.log('❌ File holder not loaded yet');
    return;
  }
  
  console.log('✅ File holder exists:', fileHolderMesh.name);
  
  // Test raycast against all scene objects to see what we're hitting
  const allIntersects = raycaster.intersectObjects(scene.children, true);
  console.log('Total scene intersections:', allIntersects.length);
  if (allIntersects.length > 0) {
    console.log('First hit:', allIntersects[0].object.name || allIntersects[0].object.type, 'distance:', allIntersects[0].distance.toFixed(2));
    
    // Log ALL intersections to see what we're hitting
    console.log('All intersections:');
    allIntersects.forEach((hit, i) => {
      console.log(`  ${i}: ${hit.object.name || hit.object.type} (distance: ${hit.distance.toFixed(2)}), userData:`, hit.object.userData);
    });
    
    // Check if we hit the clickable folder trigger sphere
    const triggerHit = allIntersects.find(hit => hit.object.userData.type === 'folderTrigger');
    
    if (triggerHit) {
      console.log('🎯 Clicked on folder trigger sphere!');
      
      // Animate ALL folders at once to different positions on the table
      folders.forEach((folderData, index) => {
        if (!folderData.isAnimating) {
          console.log(`▶️ Animating folder ${index}`);
          animateFolderToTable(folderData, index);
        }
      });
      return;
    }
    
    // Check if fileHolder is ANYWHERE in the intersections (not just first)
    const fileHolderHit = allIntersects.find(hit => {
      // Check if this object or any parent is the fileHolder
      let obj = hit.object;
      while (obj) {
        if (obj === fileHolderMesh || obj.name === 'fileHolder') {
          return true;
        }
        obj = obj.parent;
      }
      return false;
    });
    
    if (fileHolderHit) {
      console.log('🎯 Found folder holder in intersections at distance:', fileHolderHit.distance.toFixed(2));
      
      // Find a folder that's not currently animating
      const availableFolder = folders.find(f => !f.isAnimating);
      
      if (availableFolder) {
        console.log(`▶️ Animating folder ${availableFolder.index}`);
        animateFolderToTable(availableFolder);
      } else {
        console.log('⏸️ All folders are currently animating');
      }
      return;
    }
  }
  
  console.log('❌ No intersection with folder holder');
}

// Generate dynamic horizontal row layout for any number of folders
// Folders lay flat on table in a left-to-right row, stacking vertically if they overlap
function generateScatterTransform(index, tableHeight = -0.7, totalFolders = 5) {
  // Configuration
  const TABLE_CENTER_X = -2.2;  // Center X position of the table
  const TABLE_Z = -1.5;          // Z position (depth) where folders sit
  const FOLDER_WIDTH = 0.8;      // Approximate width of each folder when flat
  const TABLE_WIDTH = 4.5;       // Available table width for folders
  
  // Calculate dynamic spacing based on folder count
  const totalWidth = Math.min(FOLDER_WIDTH * totalFolders, TABLE_WIDTH);
  const spacing = totalFolders > 1 ? totalWidth / (totalFolders - 1) : 0;
  
  // Start position (leftmost)
  const startX = TABLE_CENTER_X - (totalWidth / 2);
  
  // Calculate X position for this folder
  const baseX = startX + (index * spacing);
  
  // Add small random scatter for natural look
  const randomOffset = 0.1;
  const x = baseX + (Math.random() - 0.5) * randomOffset;
  const z = TABLE_Z + (Math.random() - 0.5) * randomOffset;
  
  // Calculate vertical offset: if folders overlap horizontally, stack them slightly
  // Every folder at similar X position gets a small height bump to prevent Z-fighting
  const overlapThreshold = FOLDER_WIDTH * 0.7;
  let verticalOffset = 0;
  
  // Simple stacking: if too many folders, create layers
  if (totalFolders > 6) {
    const foldersPerRow = 6;
    const row = Math.floor(index / foldersPerRow);
    verticalOffset = row * 0.05; // Stack 0.05 units higher per row
  }
  
  const position = {
    x: x,
    y: tableHeight + verticalOffset,
    z: z
  };
  
  // Random rotation around Y axis for natural scatter look
  const rotation = {
    x: 0, // Flat on table
    y: Math.PI / 2 + (Math.random() - 0.5) * 0.3, // 90° rotation + small random yaw
    z: 0
  };
  
  return { position, rotation };
}

// Animate folder with GSAP timeline: fly up → teleport → slide onto table → rotate flat
function animateFolderToTable(folderData, folderIndex = 0) {
  folderData.isAnimating = true;
  const folder = folderData.mesh;
  
  // Create GSAP timeline
  const tl = gsap.timeline({
    onComplete: () => {
      folderData.isAnimating = false;
      console.log(`Folder ${folderData.index} animation complete`);
    }
  });
  
  // Add slight delay based on index for staggered effect
  const delay = folderIndex * 0.1;
  
  // STEP A: Fly up off-screen quickly
  tl.to(folder.position, {
    y: 10,
    duration: 0.3,
    ease: 'power2.in',
    delay: delay
  });
  
  // STEP B: Instantly teleport behind/above camera view
  tl.set(folder.position, {
    x: Math.random() * 4 - 2, // random x between -2 and 2
    y: 3,
    z: 5 // behind camera
  });
  
  // Get dynamic position and rotation based on total folder count
  const TABLE_HEIGHT = -0.7; // Adjust this if folders are floating or sinking
  const transform = generateScatterTransform(folderIndex, TABLE_HEIGHT, folders.length);
  
  // STEP C: Slide onto table surface
  // STEP D: Rotate from vertical to flat (done in parallel)
  tl.to(folder.position, {
    x: transform.position.x,
    y: transform.position.y,
    z: transform.position.z,
    duration: 1.0,
    ease: 'power2.out'
  }, '+=0'); // start immediately after .set()
  
  tl.to(folder.rotation, {
    x: transform.rotation.x,
    y: transform.rotation.y,
    z: transform.rotation.z,
    duration: 1.0,
    ease: 'power2.out'
  }, '<'); // '<' means start at the same time as previous animation
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