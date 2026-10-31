import * as THREE from 'three';
import { gsap } from 'gsap';
import { SURFACE } from './boardLayout';

const COLOR = 0xffe8d0; // ~4900 K: a touch warmer than the desk lamp, not orange
const INTENSITY = 55;

// [fraction of full intensity, seconds it holds]: a tube that catches on the third try.
const FLICKER = [
  [0.6, 0.05], [0, 0.08], [0.25, 0.04], [0, 0.18],
  [0.8, 0.06], [0.1, 0.05], [0.5, 0.04], [0, 0.1]
];

// The desk lamp's shade throws a hard V-shaped edge across the board and wall,
// so the lamp dims to this fraction while the board light is on (the unshadowed fill stays).
const LAMP_DIMMED = 0.2;

// Shines down on the cork from above and in front, off until the camera heads to the board.
// Far enough back that the top row isn't much brighter than the bottom one.
// It stays in the scene at intensity 0: hiding it would change the light count and recompile every shader.
export function createBoardLight(scene, lamp) {
  const lampIntensity = lamp.intensity;
  const light = new THREE.SpotLight(COLOR, 0, 0, 0.85, 0.6, 2);
  light.position.set(SURFACE.x, 10.5, -0.5);
  light.target.position.set(SURFACE.x, SURFACE.y, SURFACE.z);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 12;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
  scene.add(light, light.target);

  let on = false;
  let switching = null;

  function turnOn() {
    if (on) {
      return;
    }
    on = true;
    switching?.kill();
    switching = gsap.timeline({ delay: 0.25 }); // once the camera is on its way
    let time = 0;
    FLICKER.forEach(([level, hold]) => {
      switching.set(light, { intensity: level * INTENSITY }, time);
      time += hold;
    });
    switching.to(light, { intensity: INTENSITY, duration: 0.25, ease: 'power1.in' }, time);
    gsap.to(lamp, { intensity: lampIntensity * LAMP_DIMMED, duration: 0.8, delay: 0.3, ease: 'power1.inOut', overwrite: true });
  }

  function turnOff() {
    if (!on) {
      return;
    }
    on = false;
    switching?.kill();
    switching = gsap.to(light, { intensity: 0, duration: 0.3, ease: 'power1.out' });
    gsap.to(lamp, { intensity: lampIntensity, duration: 0.5, ease: 'power1.inOut', overwrite: true });
  }

  return { turnOn, turnOff };
}
