import { gsap } from 'gsap';

const DEFAULT_SCATTER_BOUNDS = {
  minX: -4.0,
  maxX: -0.4,
  minZ: -2.4,
  maxZ: -0.6,
  y: -0.7
};

let scatterBounds = { ...DEFAULT_SCATTER_BOUNDS };
const scatterLayoutCache = new Map();
const FOLDER_HALF_WIDTH = 0.18;
const FOLDER_HALF_DEPTH = 0.12;
const MAX_YAW_OFFSET = 0.22;

function hashBounds(bounds) {
  return `${bounds.minX}|${bounds.maxX}|${bounds.minZ}|${bounds.maxZ}|${bounds.y}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min, max) {
  return min + (Math.random() * (max - min));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function getRotatedHalfExtents(yaw) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));

  return {
    x: (FOLDER_HALF_WIDTH * c) + (FOLDER_HALF_DEPTH * s),
    z: (FOLDER_HALF_WIDTH * s) + (FOLDER_HALF_DEPTH * c)
  };
}

function clampPointToBounds(point, bounds, extents) {
  return {
    x: clamp(point.x, bounds.minX + extents.x, bounds.maxX - extents.x),
    z: clamp(point.z, bounds.minZ + extents.z, bounds.maxZ - extents.z)
  };
}

function buildScatterLayout(totalFolders, bounds) {
  const width = Math.max(0.2, bounds.maxX - bounds.minX);
  const depth = Math.max(0.2, bounds.maxZ - bounds.minZ);
  const areaPerFolder = (width * depth) / Math.max(1, totalFolders);
  const aspect = width / depth;
  const columns = Math.max(1, Math.ceil(Math.sqrt(totalFolders * aspect)));
  const rows = Math.max(1, Math.ceil(totalFolders / columns));
  const cellWidth = width / columns;
  const cellDepth = depth / rows;

  const minSpacingBase = clamp(Math.sqrt(areaPerFolder) * 0.36, 0.16, 0.4);
  const softMinDistance = minSpacingBase;
  const hardMinDistance = softMinDistance * 0.7;
  const folderArea = (FOLDER_HALF_WIDTH * 2) * (FOLDER_HALF_DEPTH * 2);
  const densityScale = clamp(areaPerFolder / (folderArea * 2.2), 0.62, 1.0);

  const anchors = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      anchors.push({
        x: bounds.minX + ((col + 0.5) * cellWidth),
        z: bounds.minZ + ((row + 0.5) * cellDepth)
      });
    }
  }

  shuffle(anchors);

  const maxJitterX = Math.min(0.28, cellWidth * 0.34);
  const maxJitterZ = Math.min(0.28, cellDepth * 0.34);

  const items = anchors.slice(0, totalFolders).map((anchor) => {
    const angle = Math.PI / 2 + randomInRange(-MAX_YAW_OFFSET, MAX_YAW_OFFSET);
    const extents = getRotatedHalfExtents(angle);
    const jittered = {
      x: anchor.x + randomInRange(-maxJitterX, maxJitterX),
      z: anchor.z + randomInRange(-maxJitterZ, maxJitterZ)
    };
    const clamped = clampPointToBounds(jittered, bounds, extents);

    return {
      x: clamped.x,
      z: clamped.z,
      anchor,
      angle,
      extents
    };
  });

  for (let iteration = 0; iteration < 8; iteration++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const dx = items[j].x - items[i].x;
        const dz = items[j].z - items[i].z;
        const dist = Math.sqrt((dx * dx) + (dz * dz));

        const radiusI = Math.sqrt((items[i].extents.x ** 2) + (items[i].extents.z ** 2));
        const radiusJ = Math.sqrt((items[j].extents.x ** 2) + (items[j].extents.z ** 2));
        const targetPairDistance = Math.max(
          hardMinDistance * 0.75,
          ((radiusI + radiusJ) * 0.92 * densityScale) + (softMinDistance * 0.18)
        );
        const relaxedPairDistance = Math.max(hardMinDistance * 0.6, targetPairDistance * 0.72);

        if (dist <= 0.0001 || dist >= targetPairDistance) {
          continue;
        }

        const minDistance = dist < relaxedPairDistance ? relaxedPairDistance : targetPairDistance;
        const overlap = minDistance - dist;
        const push = overlap * 0.38;
        const nx = dx / dist;
        const nz = dz / dist;

        const movedI = {
          x: items[i].x - (nx * push),
          z: items[i].z - (nz * push)
        };
        const movedJ = {
          x: items[j].x + (nx * push),
          z: items[j].z + (nz * push)
        };

        const clampedI = clampPointToBounds(movedI, bounds, items[i].extents);
        const clampedJ = clampPointToBounds(movedJ, bounds, items[j].extents);

        items[i].x = clampedI.x;
        items[i].z = clampedI.z;
        items[j].x = clampedJ.x;
        items[j].z = clampedJ.z;
      }
    }

    for (let i = 0; i < items.length; i++) {
      const moved = {
        x: items[i].x + ((items[i].anchor.x - items[i].x) * 0.16),
        z: items[i].z + ((items[i].anchor.z - items[i].z) * 0.16)
      };
      const clamped = clampPointToBounds(moved, bounds, items[i].extents);
      items[i].x = clamped.x;
      items[i].z = clamped.z;
    }
  }

  return items.map((item, index) => {
    const angle = item.angle;
    const tilt = randomInRange(-0.04, 0.04);
    const stackLift = (index % 3) * 0.004;

    return {
      position: {
        x: item.x,
        y: bounds.y + stackLift,
        z: item.z
      },
      rotation: {
        x: tilt,
        y: angle,
        z: randomInRange(-0.035, 0.035)
      }
    };
  });
}

export function setFolderScatterBounds(bounds = {}) {
  const nextBounds = {
    minX: Number.isFinite(bounds.minX) ? bounds.minX : scatterBounds.minX,
    maxX: Number.isFinite(bounds.maxX) ? bounds.maxX : scatterBounds.maxX,
    minZ: Number.isFinite(bounds.minZ) ? bounds.minZ : scatterBounds.minZ,
    maxZ: Number.isFinite(bounds.maxZ) ? bounds.maxZ : scatterBounds.maxZ,
    y: Number.isFinite(bounds.y) ? bounds.y : scatterBounds.y
  };

  if (nextBounds.minX >= nextBounds.maxX || nextBounds.minZ >= nextBounds.maxZ) {
    console.warn('Invalid folder scatter bounds. Keeping previous bounds.', bounds);
    return;
  }

  scatterBounds = nextBounds;
  scatterLayoutCache.clear();
}

export function generateScatterTransform(index, tableHeight = -0.7, totalFolders = 5) {
  const activeBounds = {
    ...scatterBounds,
    y: Number.isFinite(tableHeight) ? tableHeight : scatterBounds.y
  };

  const layoutKey = `${totalFolders}|${hashBounds(activeBounds)}`;
  if (!scatterLayoutCache.has(layoutKey)) {
    scatterLayoutCache.set(layoutKey, buildScatterLayout(totalFolders, activeBounds));
  }

  const layout = scatterLayoutCache.get(layoutKey);
  return layout[index] || layout[layout.length - 1];
}

export function animateFolderToTable(folderData, folderIndex = 0, totalFolders = 1) {
  folderData.isAnimating = true;
  const folder = folderData.mesh;

  const timeline = gsap.timeline({
    onComplete: () => {
      folderData.isAnimating = false;
      console.log(`Folder ${folderData.index} animation complete`);
    }
  });

  const delay = folderIndex * 0.1;

  timeline.to(folder.position, {
    y: 10,
    duration: 0.3,
    ease: 'power2.in',
    delay
  });

  timeline.set(folder.position, {
    x: Math.random() * 4 - 2,
    y: 3,
    z: 5
  });

  const tableHeight = -0.7;
  const transform = generateScatterTransform(folderIndex, tableHeight, totalFolders);

  timeline.to(folder.position, {
    x: transform.position.x,
    y: transform.position.y,
    z: transform.position.z,
    duration: 1.0,
    ease: 'power2.out'
  }, '+=0');

  timeline.to(folder.rotation, {
    x: transform.rotation.x,
    y: transform.rotation.y,
    z: transform.rotation.z,
    duration: 1.0,
    ease: 'power2.out'
  }, '<');
}
