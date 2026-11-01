import * as THREE from "three";

// Create the WebGL renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

// Set the renderer size to match the browser
renderer.setSize(window.innerWidth, window.innerHeight);

// Improve rendering quality on high-resolution screens
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

export default renderer;