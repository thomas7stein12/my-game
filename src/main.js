import * as THREE from "three";
import { PlayerControls } from "./components/PlayerControls.js";
import scene from "./components/Scene.js";
import camera from "./components/Camera.js";
import renderer from "./components/Renderer.js";
import directionalLight from "./components/DirectionalLight.js";
import platform from "./components/Platform.js";
import { createFloatingIcon } from "./components/FloatingIcon.js";
import jumpPlatforms, {
  platformSurfaces,
  platformDefinitions,
} from "./components/JumpPlatforms.js";
import { loadRockModel, addRock, addRockSupport } from "./components/Rock.js";
import "./style.css";

// Get the application container
const app = document.querySelector("#app");

// Add the renderer to the page
app.appendChild(renderer.domElement);

// Initialize first-person controls
const playerControls = PlayerControls(
  camera,
  renderer.domElement,
  platformSurfaces,
);

// Create a clock to track frame time
const clock = new THREE.Clock();

// Add lighting to the scene
scene.add(directionalLight);

// Add the original ground platform
scene.add(platform);

// Load our boulder model once.
loadRockModel()
  .then((rockModel) => {
    // Create a boulder for every jumping platform.
    platformDefinitions.forEach((data) => {
      // Add decorative support rocks underneath higher platforms.
      // These rocks are purely visual and have no collision.
      if (data.addSupportRocks) {
        addRockSupport(scene, rockModel, {
          position: {
            x: data.x,
            z: data.z,
          },

          topY: data.topY,
          scale: data.rockScale,
          rotationY: data.rockRotationY,
        });
      }

      // Add the playable boulder on top.
      addRock(scene, rockModel, {
        position: {
          x: data.x,
          y: 0,
          z: data.z,
        },

        scale: data.rockScale,
        rotationY: data.rockRotationY,

        // Align the rock with its collision surface.
        topY: data.topY,
      });
    });
  })
  .catch((error) => {
    console.error("Failed to load boulder models:", error);
  });

// Add all elevated jumping platforms
scene.add(jumpPlatforms);

// Original floating marker
const centerMarker = createFloatingIcon(scene);

// Second floating marker on the highest platform
const topMarker = createFloatingIcon(scene, {
  position: {
    x: 1.8,
    y: 4.5,
    z: 2.3,
  },

  headingText: "You made it to the top!",

  descriptionText: "You climbed all five platforms. Nice work!",
});

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

  // Animate the icon and check player distance
  // Update the original marker
  centerMarker.update(camera, clock.elapsedTime);

  // Update the top marker
  topMarker.update(camera, clock.elapsedTime);

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
