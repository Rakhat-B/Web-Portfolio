import { createRenderer, createScene, createCamera, addLights, bindResize } from './core/scene';
import { createGltfLoader } from './core/loaders';
import { createCameraControls } from './features/camera/cameraController';
import { loadWorldAndFolderTemplate } from './features/world/worldLoader';
import { createFolderClones } from './features/folders/folderSpawner';
import { animateFolderToTable } from './features/folders/folderAnimations';
import { createFolderInteraction } from './features/folders/folderInteractions';
import './style.scss';

const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();
const controls = createCameraControls(camera, renderer.domElement);
addLights(scene);
bindResize(camera, renderer);

const gltfLoader = createGltfLoader();
const folders = [];
let fileHolderMesh = null;

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

async function bootstrap() {
  const { folderTemplate } = await loadWorldAndFolderTemplate({
    gltfLoader,
    scene,
    onFileHolderFound: (mesh) => {
      fileHolderMesh = mesh;
    }
  });

  if (folderTemplate && fileHolderMesh) {
    const createdFolders = createFolderClones({
      template: folderTemplate,
      fileHolderMesh,
      scene,
      numFolders: 10
    });

    folders.push(...createdFolders);
    console.log('Folders array:', folders);
  }

  createFolderInteraction({
    scene,
    camera,
    folders,
    getFileHolderMesh: () => fileHolderMesh,
    onFolderTriggerClick: (singleFolder) => {
      if (singleFolder) {
        animateFolderToTable(singleFolder, singleFolder.index, folders.length);
        return;
      }

      folders.forEach((folderData, index) => {
        if (!folderData.isAnimating) {
          console.log(`▶️ Animating folder ${index}`);
          animateFolderToTable(folderData, index, folders.length);
        }
      });
    }
  });
}

bootstrap();
animate();
window.scene = scene;