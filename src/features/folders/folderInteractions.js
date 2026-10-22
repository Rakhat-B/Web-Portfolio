import * as THREE from 'three';
import { gsap } from 'gsap';

const HOVER_LIFT = 0.12;
const HOVER_DURATION = 0.22;
const OUTLINE_COLOR = 0x111111;
const HOVER_COLLIDER_SIZE = [1.1, 0.1, 1.35]; // folder footprint (1.06 × 1.32) plus a margin
const SHOW_HOVER_SPHERES = false;

export function createFolderInteraction({ camera, folders, isActive, onHoverChange }) {
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
      new THREE.BoxGeometry(...HOVER_COLLIDER_SIZE),
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
    folderData.mesh.add(collider);
    folderData.hoverCollider = collider;
  }

  function ensureFolderOutline(folderData) {
    if (folderData.outlineSegments) {
      return;
    }

    const segments = [];

    folderData.mesh.traverse((child) => {
      // Skip the invisible hover box: its outline drew a rectangle and its lines stole click raycasts.
      if (!child.isMesh || !child.geometry || child === folderData.hoverCollider) {
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
    onHoverChange(hoveredFolder);
  }

  function clearHoveredFolder() {
    if (!hoveredFolder) {
      return;
    }

    setFolderHoverState(hoveredFolder, false);
    hoveredFolder = null;
    onHoverChange(null);
  }

  function onMouseMove(event) {
    if (!isActive()) {
      clearHoveredFolder();
      return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    updateHoveredFolder();
  }

  window.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('mouseleave', clearHoveredFolder, false);

  return { clearHoveredFolder };
}
