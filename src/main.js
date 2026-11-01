import * as THREE from "three";
import { PlayerControls } from "./components/PlayerControls.js";
import scene from "./components/Scene.js";
import camera from "./components/Camera.js";
import renderer from "./components/Renderer.js";
import directionalLight from "./components/DirectionalLight.js";
import platform from "./components/Platform.js";
import "./style.css";

// Get the application container
const app = document.querySelector("#app");

// Add the renderer to the page
app.appendChild(renderer.domElement);

// Initialize first-person controls
const playerControls = PlayerControls(camera, renderer.domElement);

// Create a clock to track frame time
const clock = new THREE.Clock();

// Add lighting to the scene
scene.add(directionalLight);

// Add the platform
scene.add(platform);

// Add some ambient lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Create a cube
const geometry = new THREE.BoxGeometry(1, 1, 1);

const material = new THREE.MeshStandardMaterial({
  color: 0x44aa88,
});

const cube = new THREE.Mesh(geometry, material);


// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Get time since the previous frame
  const delta = Math.min(clock.getDelta(), 0.05);

  // Update player movement
  playerControls.update(delta);

  // Render the scene
  renderer.render(scene, camera);
}

animate();

// Handle browser resizing
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});