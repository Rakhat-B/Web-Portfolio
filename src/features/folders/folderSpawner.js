import * as THREE from 'three';

// Centre of the front folder in the holder; the rest step back along z.
const HOLDER_START = { x: -2.855, y: 4.79, z: 2.755 };
const HOLDER_DEPTH_SPAN = 0.12;

// The model's geometry sits ~4.85 above its own origin. Re-centre it once so a
// folder's position is its real centre (slots, hover colliders, rotations).
function centerTemplate(template) {
  const center = new THREE.Box3().setFromObject(template).getCenter(new THREE.Vector3());
  template.children.forEach((child) => child.position.sub(center));
}

export function createFolderClones({ template, scene, numFolders }) {
  centerTemplate(template);

  const spacingZ = numFolders > 1 ? HOLDER_DEPTH_SPAN / (numFolders - 1) : 0;
  const folders = [];

  for (let i = 0; i < numFolders; i++) {
    const folderClone = template.clone();

    folderClone.position.set(HOLDER_START.x, HOLDER_START.y, HOLDER_START.z + (i * spacingZ));
    folderClone.rotation.set(Math.PI / 2, 0, 0); // standing upright in the holder

    folderClone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material && child.material.map) {
          child.material.map.colorSpace = THREE.SRGBColorSpace;
        }
      }
    });

    scene.add(folderClone);

    folders.push({
      mesh: folderClone,
      homePosition: folderClone.position.clone(),
      homeRotation: folderClone.rotation.clone(),
      isAnimating: false,
      index: i
    });
  }

  return folders;
}
