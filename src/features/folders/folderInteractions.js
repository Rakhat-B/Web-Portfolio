import * as THREE from 'three';
import { gsap } from 'gsap';

const HOVER_LIFT = 0.12;
const HOVER_DURATION = 0.22;
const OUTLINE_COLOR = 0x111111;
const HOVER_COLLIDER_RADIUS = 0.28;
const SHOW_HOVER_SPHERES = false;

export function createFolderInteraction({ scene, camera, folders, getFileHolderMesh, onFolderTriggerClick, hoverPlaneY = null }) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredFolder = null;
  const folderRoots = [];
  const objectToFolder = new WeakMap();
  const hoverColliders = [];

  function buildFolderLookup() {
    folderRoots.length = 0;
    hoverColliders.length = 0;

    folders.forEach((folderData) => {
      if (!folderData?.mesh) {
        return;
      }

      folderRoots.push(folderData.mesh);
      objectToFolder.set(folderData.mesh, folderData);

      folderData.mesh.traverse((child) => {
        objectToFolder.set(child, folderData);
      });

      ensureHoverCollider(folderData);

      if (folderData.hoverCollider) {
        hoverColliders.push(folderData.hoverCollider);
      }
    });
  }

  buildFolderLookup();

  function ensureHoverCollider(folderData) {
    if (folderData.hoverCollider) {
      return;
    }

    const collider = new THREE.Mesh(
      new THREE.SphereGeometry(HOVER_COLLIDER_RADIUS, 12, 10),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: SHOW_HOVER_SPHERES ? 0.18 : 0,
        depthWrite: false,
        wireframe: SHOW_HOVER_SPHERES
      })
    );

    collider.userData.type = 'folderHoverCollider';
    collider.userData.folderRef = folderData;
    collider.position.set(0, 0.02, 0);
    folderData.mesh.add(collider);
    folderData.hoverCollider = collider;
  }

  function ensureFolderOutline(folderData) {
    if (folderData.outlineSegments) {
      return;
    }

    const segments = [];

    folderData.mesh.traverse((child) => {
      if (!child.isMesh || !child.geometry) {
        return;
      }

      const edges = new THREE.EdgesGeometry(child.geometry, 35);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: OUTLINE_COLOR,
          transparent: true,
          opacity: 0.9,
          depthTest: true
        })
      );

      line.visible = false;
      line.renderOrder = 2;
      line.scale.setScalar(1.01);
      child.add(line);
      segments.push(line);
    });

    folderData.outlineSegments = segments;
  }

  function setFolderHoverState(folderData, shouldHover) {
    if (!folderData) {
      return;
    }

    ensureFolderOutline(folderData);

    if (shouldHover) {
      if (folderData.isAnimating) {
        return;
      }

      if (!folderData.isHovered) {
        folderData.hoverBaseY = folderData.mesh.position.y;
      }

      folderData.isHovered = true;
      folderData.outlineSegments.forEach((segment) => {
        segment.visible = true;
      });

      gsap.to(folderData.mesh.position, {
        y: folderData.hoverBaseY + HOVER_LIFT,
        duration: HOVER_DURATION,
        ease: 'power2.out',
        overwrite: 'auto'
      });

      return;
    }

    folderData.isHovered = false;
    folderData.outlineSegments.forEach((segment) => {
      segment.visible = false;
    });

    const targetY = Number.isFinite(folderData.hoverBaseY)
      ? folderData.hoverBaseY
      : folderData.mesh.position.y;

    gsap.to(folderData.mesh.position, {
      y: targetY,
      duration: HOVER_DURATION,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    folderData.hoverBaseY = undefined;
  }

  function getFolderFromObject(object) {
    let current = object;

    while (current) {
      const match = objectToFolder.get(current);
      if (match) {
        return match;
      }
      current = current.parent;
    }

    return null;
  }

  function updateHoveredFolder() {
    raycaster.setFromCamera(mouse, camera);
    const hoverHits = raycaster.intersectObjects(hoverColliders, false);
    const topHoverHit = hoverHits.find((hit) => {
      const folderData = hit.object?.userData?.folderRef;
      return folderData && !folderData.isAnimating;
    });

    const nextHovered = topHoverHit ? topHoverHit.object.userData.folderRef : null;

    if (nextHovered === hoveredFolder) {
      return;
    }

    if (hoveredFolder) {
      setFolderHoverState(hoveredFolder, false);
    }

    hoveredFolder = nextHovered;

    if (hoveredFolder) {
      setFolderHoverState(hoveredFolder, true);
    }
  }

  function clearHoveredFolder() {
    if (!hoveredFolder) {
      return;
    }

    setFolderHoverState(hoveredFolder, false);
    hoveredFolder = null;
  }

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
        clearHoveredFolder();
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

  function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    updateHoveredFolder();
  }

  function onMouseLeave() {
    clearHoveredFolder();
  }

  window.addEventListener('click', onMouseClick, false);
  window.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('mouseleave', onMouseLeave, false);

  return () => {
    window.removeEventListener('click', onMouseClick, false);
    window.removeEventListener('mousemove', onMouseMove, false);
    window.removeEventListener('mouseleave', onMouseLeave, false);
    clearHoveredFolder();

    folders.forEach((folderData) => {
      if (!folderData?.hoverCollider) {
        return;
      }

      const collider = folderData.hoverCollider;
      if (collider.parent) {
        collider.parent.remove(collider);
      }

      collider.geometry.dispose();
      collider.material.dispose();
      folderData.hoverCollider = null;
    });
  };
}
