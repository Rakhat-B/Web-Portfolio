import * as THREE from 'three';

export function createFolderInteraction({ scene, camera, folders, getFileHolderMesh, onFolderTriggerClick }) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function handleFolderClick() {
    raycaster.setFromCamera(mouse, camera);

    console.log('🖱️ Click detected! Mouse:', mouse.x.toFixed(2), mouse.y.toFixed(2));
    console.log('Camera position:', camera.position);

    const fileHolderMesh = getFileHolderMesh();
    if (!fileHolderMesh) {
      console.log('❌ File holder not loaded yet');
      return;
    }

    console.log('✅ File holder exists:', fileHolderMesh.name);

    const allIntersects = raycaster.intersectObjects(scene.children, true);
    console.log('Total scene intersections:', allIntersects.length);

    if (allIntersects.length === 0) {
      console.log('❌ No intersection with folder holder');
      return;
    }

    console.log('First hit:', allIntersects[0].object.name || allIntersects[0].object.type, 'distance:', allIntersects[0].distance.toFixed(2));

    console.log('All intersections:');
    allIntersects.forEach((hit, index) => {
      console.log(`  ${index}: ${hit.object.name || hit.object.type} (distance: ${hit.distance.toFixed(2)}), userData:`, hit.object.userData);
    });

    const triggerHit = allIntersects.find((hit) => hit.object.userData.type === 'folderTrigger');
    if (triggerHit) {
      console.log('🎯 Clicked on folder trigger sphere!');
      onFolderTriggerClick();
      return;
    }

    const fileHolderHit = allIntersects.find((hit) => {
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

      const availableFolder = folders.find((folder) => !folder.isAnimating);
      if (availableFolder) {
        console.log(`▶️ Animating folder ${availableFolder.index}`);
        onFolderTriggerClick(availableFolder);
      } else {
        console.log('⏸️ All folders are currently animating');
      }
      return;
    }

    console.log('❌ No intersection with folder holder');
  }

  function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    handleFolderClick();
  }

  window.addEventListener('click', onMouseClick, false);

  return () => {
    window.removeEventListener('click', onMouseClick, false);
  };
}
