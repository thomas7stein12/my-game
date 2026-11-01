import * as THREE from "three";

// Create a group for the platform
const platform = new THREE.Group();

// Create the floor geometry
const geometry = new THREE.PlaneGeometry(20, 20);

// Create the floor material
const material = new THREE.MeshStandardMaterial({
  color: 0x568c5a,
  roughness: 1,
});

// Create the floor mesh
const floor = new THREE.Mesh(geometry, material);

// Rotate the floor to make it horizontal
floor.rotation.x = -Math.PI / 2;

platform.add(floor);

// Add a grid to make movement easier to visualize
const grid = new THREE.GridHelper(
  20,
  20,
  0x2f5131,
  0x78947b,
);

grid.position.y = 0.01;

platform.add(grid);

export default platform;