import { gsap } from 'gsap';

export function generateScatterTransform(index, tableHeight = -0.7, totalFolders = 5) {
  const tableCenterX = -2.2;
  const tableZ = -1.5;
  const folderWidth = 0.8;
  const tableWidth = 4.5;

  const totalWidth = Math.min(folderWidth * totalFolders, tableWidth);
  const spacing = totalFolders > 1 ? totalWidth / (totalFolders - 1) : 0;
  const startX = tableCenterX - (totalWidth / 2);
  const baseX = startX + (index * spacing);

  const randomOffset = 0.1;
  const x = baseX + (Math.random() - 0.5) * randomOffset;
  const z = tableZ + (Math.random() - 0.5) * randomOffset;

  let verticalOffset = 0;
  if (totalFolders > 6) {
    const foldersPerRow = 6;
    const row = Math.floor(index / foldersPerRow);
    verticalOffset = row * 0.05;
  }

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
