import * as THREE from "three";

// Create a directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);

// Position the light
directionalLight.position.set(5, 5, 5);

export default directionalLight;