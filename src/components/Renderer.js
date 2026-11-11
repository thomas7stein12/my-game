
import * as THREE from "three";

// Create the WebGL renderer.
const renderer = new THREE.WebGLRenderer({
  // Disable multisample antialiasing for better performance.
  antialias: false,
});

// Render at normal resolution instead of Retina resolution.
// This significantly reduces the GPU workload.
renderer.setPixelRatio(1);

// Set the renderer size to match the browser.
renderer.setSize(window.innerWidth, window.innerHeight);

export default renderer;
