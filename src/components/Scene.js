import * as THREE from "three";

// Create the main 3D scene.
const scene = new THREE.Scene();

// Choose a muted forest fog color.
export const fogColor = new THREE.Color(0xb8c3b6);

// Set the initial background to match the fog.
scene.background = fogColor.clone();

// Add realistic distance fog.
scene.fog = new THREE.Fog(fogColor, 20, 52);

export default scene;