import { gsap } from 'gsap';

export function generateScatterTransform(index, tableHeight = -0.7, totalFolders = 5) {
  const tableCenterX = -2.2;
  const tableCenterZ = -1.5;
  const tableWidth = 4.5;
  const tableDepth = 2.4;
  const marginX = 0.35;
  const marginZ = 0.25;

  const usableWidth = Math.max(0.2, tableWidth - marginX * 2);
  const usableDepth = Math.max(0.2, tableDepth - marginZ * 2);

  const aspect = usableWidth / usableDepth;
  const columns = Math.max(1, Math.ceil(Math.sqrt(totalFolders * aspect)));
  const rows = Math.max(1, Math.ceil(totalFolders / columns));

  const col = index % columns;
  const row = Math.floor(index / columns);

  const spacingX = columns > 1 ? usableWidth / (columns - 1) : 0;
  const spacingZ = rows > 1 ? usableDepth / (rows - 1) : 0;

  const startX = tableCenterX - (usableWidth / 2);
  const startZ = tableCenterZ - (usableDepth / 2);

  const jitterX = Math.min(0.12, spacingX * 0.2);
  const jitterZ = Math.min(0.12, spacingZ * 0.2);

  const x = startX + (col * spacingX) + (Math.random() - 0.5) * jitterX;
  const z = startZ + (row * spacingZ) + (Math.random() - 0.5) * jitterZ;

  const verticalOffset = row * 0.01;

  return {
    position: {
      x,
      y: tableHeight + verticalOffset,
      z
    },
    rotation: {
      x: 0,
      y: Math.PI / 2 + (Math.random() - 0.5) * 0.3,
      z: 0
    }
  };
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
