import * as THREE from 'three';
import { publicUrl } from '../../core/paths';

const WORLD_URL = publicUrl('/models/world_scene.glb');
const FOLDER_URL = publicUrl('/models/folder_template.glb');

function prepareWorldMesh(root, scene, onFileHolderFound) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material && child.material.map) {
        child.material.map.colorSpace = THREE.SRGBColorSpace;
      }
    }

    if (child.name === 'fileHolder') {
      const clickSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0xff00ff,
          transparent: true,
          opacity: 0,
          depthTest: true,
          wireframe: false,
          side: THREE.DoubleSide
        })
      );

      clickSphere.position.set(-2.5, 5, 2.7);
      clickSphere.userData.isClickable = true;
      clickSphere.userData.type = 'folderTrigger';
      scene.add(clickSphere);
      onFileHolderFound(child);
    }
  });
}

export async function loadWorldAndFolderTemplate({ gltfLoader, scene, onFileHolderFound }) {
  try {
    const worldGltf = await gltfLoader.loadAsync(WORLD_URL);
    const root = worldGltf.scene || worldGltf.scenes[0];

    if (!root) {
      console.warn('GLTF loaded but contains no scene graph:', worldGltf);
      return { fileHolderMesh: null, folderTemplate: null };
    }

    prepareWorldMesh(root, scene, onFileHolderFound);
    scene.add(root);

    const folderGltf = await gltfLoader.loadAsync(FOLDER_URL);
    const folderTemplate = folderGltf.scene || folderGltf.scenes[0];

    if (!folderTemplate) {
      console.warn('folder_template.glb loaded but contains no scene');
      return { fileHolderMesh: null, folderTemplate: null };
    }

    return { folderTemplate };
  } catch (error) {
    console.error('Error loading scene or folder model', error);
    return { folderTemplate: null };
  }
}
