import * as THREE from 'three';

const START_X = -2.25;
const START_Y = 4.7;
const START_Z = -2.1;
const SPACING_X = 0.0;
const SPACING_Y = 0.0;
const ROTATION_X = Math.PI / 2;
const ROTATION_Y = 0;
const ROTATION_Z = 0;
const BASE_FOLDER_COUNT = 5;
const BASE_SPACING_Z = 0.03;
const HOLDER_DEPTH_SPAN = BASE_SPACING_Z * Math.max(BASE_FOLDER_COUNT - 1, 1);

export function createFolderClones({ template, fileHolderMesh, scene, numFolders = 10 }) {
  if (!fileHolderMesh) {
    console.warn('fileHolder not found, cannot position folders');
    return [];
  }

  const holderWorldPos = new THREE.Vector3();
  fileHolderMesh.getWorldPosition(holderWorldPos);
  console.log('FileHolder world position:', `x:${holderWorldPos.x.toFixed(2)}, y:${holderWorldPos.y.toFixed(2)}, z:${holderWorldPos.z.toFixed(2)}`);

  const spacingZ = numFolders > 1 ? HOLDER_DEPTH_SPAN / (numFolders - 1) : 0;
  const folders = [];

  for (let i = 0; i < numFolders; i++) {
    const folderClone = template.clone();

    folderClone.position.set(
      START_X + (i * SPACING_X),
      START_Y + (i * SPACING_Y),
      START_Z + (i * spacingZ)
    );

    folderClone.rotation.set(ROTATION_X, ROTATION_Y, ROTATION_Z);

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
      isAnimating: false,
      index: i
    });

    const pos = folderClone.position;
    console.log(`Folder ${i} position: x:${pos.x.toFixed(2)}, y:${pos.y.toFixed(2)}, z:${pos.z.toFixed(2)}`);
  }

  console.log(`Created ${numFolders} folder clones`);
  return folders;
}
