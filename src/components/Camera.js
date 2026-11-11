import * as THREE from "three";

// Create the perspective camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  80,
);

// Position the camera
camera.position.set(0, 1.7, 5);

export default camera;