import * as THREE from 'three';

const WORLD_URL = '/models/world_scene.glb';
const FOLDER_URL = '/models/folder_template.glb';

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
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);

      console.log('Found fileHolder:');
      console.log('  Local position:', `x:${child.position.x.toFixed(2)}, y:${child.position.y.toFixed(2)}, z:${child.position.z.toFixed(2)}`);
      console.log('  World position:', `x:${worldPos.x.toFixed(2)}, y:${worldPos.y.toFixed(2)}, z:${worldPos.z.toFixed(2)}`);
      console.log('  Rotation:', `x:${child.rotation.x.toFixed(2)}, y:${child.rotation.y.toFixed(2)}, z:${child.rotation.z.toFixed(2)}`);

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

      console.log('✅ Created invisible click sphere (radius 1.5) at folder holder position');
      onFileHolderFound(child);
    }
  });
}

function loadModel(gltfLoader, url, progressLabel) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        resolve(gltf);
      },
      (progress) => {
        if (progress.total) {
          console.log(`${progressLabel} ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

export async function loadWorldAndFolderTemplate({ gltfLoader, scene, onFileHolderFound }) {
  try {
    const worldGltf = await loadModel(gltfLoader, WORLD_URL, 'world_scene.glb');
    const root = worldGltf.scene || worldGltf.scenes[0];

    if (!root) {
      console.warn('GLTF loaded but contains no scene graph:', worldGltf);
      return { fileHolderMesh: null, folderTemplate: null };
    }

    prepareWorldMesh(root, scene, onFileHolderFound);
    scene.add(root);
    console.log('Loaded world_scene:', worldGltf);

    const folderGltf = await loadModel(gltfLoader, FOLDER_URL, 'folder_template.glb');
    const folderTemplate = folderGltf.scene || folderGltf.scenes[0];

    if (!folderTemplate) {
      console.warn('folder_template.glb loaded but contains no scene');
      return { fileHolderMesh: null, folderTemplate: null };
    }

    console.log('Loaded folder_template:', folderGltf);
    return { folderTemplate };
  } catch (error) {
    console.error('Error loading scene or folder model', error);
    return { folderTemplate: null };
  }
}
