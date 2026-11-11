import * as THREE from "three";

// Create the main 3D scene.
const scene = new THREE.Scene();

// Choose a muted forest fog color.
const fogColor = 0xb8c3b6;

// Set the visible background to match the fog.
scene.background = new THREE.Color(fogColor);

// Add realistic distance fog.
scene.fog = new THREE.Fog(fogColor, 20, 52);

export default scene;
