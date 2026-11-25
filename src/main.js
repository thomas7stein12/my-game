import * as THREE from "three";
import { PlayerControls } from "./components/PlayerControls.js";
import scene, { fogColor } from "./components/Scene.js";
import camera from "./components/Camera.js";
import renderer from "./components/Renderer.js";
import directionalLight from "./components/DirectionalLight.js";
import { loadForestGround } from "./components/ForestGround.js";
import { createFloatingIcon } from "./components/FloatingIcon.js";
import { loadForestEnvironment } from "./components/ForestEnvironment.js";
import { loadCliff } from "./components/Cliff.js";
import { loadForestTrees } from "./components/ForestTrees.js";
import { createForestSkyFog } from "./components/ForestSky.js";
import { loadForestGrass } from "./components/ForestGrass.js";
import { WorldChunkManager } from "./components/WorldChunkManager.js";
import { loadCaveEntrance } from "./components/CaveEntrance.js";
import "./style.css";

// Get the application container
const app = document.querySelector("#app");

// Add the renderer to the page
app.appendChild(renderer.domElement);

// Store collision boundaries for all our rocks.
const rockColliders = [];

// Initialize first-person controls
const playerControls = PlayerControls(
  camera,
  renderer.domElement,
  [],
  rockColliders,
);

// Create a clock to track frame time
const clock = new THREE.Clock();

// Store the fog layer that hides the sky near the horizon.
let skyFogOverlay = null;

// Manages which grass world chunks are loaded.
let grassChunkManager = null;
let treeChunkManager = null;

// Add lighting to the scene
scene.add(directionalLight);

// Load our realistic forest ground.
loadForestGround()
  .then((ground) => {
    scene.add(ground);
  })
  .catch((error) => {
    console.error("Failed to load forest ground:", error);
  });

// Load our forest environment.
loadForestEnvironment()
  .then((environmentMap) => {
    // Use the HDR environment for natural lighting and reflections.
    scene.environment = environmentMap;

    // Use the HDR environment as the visible sky.
    scene.background = environmentMap;

    // Add the fog layer that hides the sky when looking through the trees.
    skyFogOverlay = createForestSkyFog(fogColor);
    scene.add(skyFogOverlay);
  })
  .catch((error) => {
    console.error("Failed to load forest environment:", error);
  });

// Load our main cliff environment.
loadCliff()
  .then((cliff) => {
    scene.add(cliff);
  })
  .catch((error) => {
    console.error("Failed to load cliff environment:", error);
  });

// Load our natural cave entrance.
loadCaveEntrance()
  .then(({ group, colliders }) => {
    scene.add(group);

    // Register collision boundaries for all cave rocks.
    rockColliders.push(...colliders);
  })
  .catch((error) => {
    console.error("Failed to load cave entrance:", error);
  });

// Temp to add new computer

loadForestTrees()
  .then((trees) => {
    scene.add(trees.group);

    window.__perfGroups ??= {};
    window.__perfGroups.trees = trees.group;

    treeChunkManager = new WorldChunkManager({
      name: "Tree",
      camera,

      chunks: trees.chunks,

      loadChunk: trees.loadChunk,

      unloadChunk: trees.unloadChunk,

      loadDistance: 12,
      unloadDistance: 18,
      maxViewDistance: 52,

      updateInterval: 0.2,
      maxLoadsPerUpdate: 2,
    });

    treeChunkManager.update(0);

    console.log(`Tree world chunks ready: ${trees.chunks.size}`);
  })
  .catch((error) => {
    console.error("Failed to load forest trees:", error);
  });

// Load and manage individual grass world chunks.
loadForestGrass()
  .then((grass) => {
    // Add the main grass container to the scene.
    scene.add(grass.group);

    window.__perfGroups ??= {};
    window.__perfGroups.grass = grass.group;

    // Initialize the world chunk manager.
    grassChunkManager = new WorldChunkManager({
      name: "Grass",
      camera,

      chunks: grass.chunks,

      loadChunk: grass.loadChunk,

      unloadChunk: grass.unloadChunk,

      loadDistance: 12,
      unloadDistance: 18,
      maxViewDistance: 52,

      updateInterval: 0.2,
      maxLoadsPerUpdate: 4,
    });

    // Load the initial nearby and visible chunks.
    grassChunkManager.update(0);

    console.log(`Grass world chunks ready: ${grass.chunks.size}`);
  })
  .catch((error) => {
    console.error("Failed to load forest grass:", error);
  });


// Original floating marker
const centerMarker = createFloatingIcon(scene);

// Add some ambient lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Create a cube
const geometry = new THREE.BoxGeometry(1, 1, 1);

const material = new THREE.MeshStandardMaterial({
  color: 0x44aa88,
});

const cube = new THREE.Mesh(geometry, material);

// Performance monitoring.
let statsLastTime = 0;
let statsFrameCount = 0;

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Get time since the previous frame
  const delta = Math.min(clock.getDelta(), 0.05);

  // Update player movement
  playerControls.update(delta);

  // Update nearby and visible grass world chunks.
  if (grassChunkManager) {
    grassChunkManager.update(delta);
  }

  if (treeChunkManager) {
    treeChunkManager.update(delta);
  }

  // Animate the icon and check player distance
  // Update the original marker
  centerMarker.update(camera, clock.elapsedTime);

  // Keep the sky fog centered on the player.
  if (skyFogOverlay) {
    skyFogOverlay.position.copy(camera.position);
  }

  // Render the scene
  renderer.render(scene, camera);

  // Count frames for average FPS.
  statsFrameCount++;

  const statsElapsed = clock.elapsedTime;

  // Print performance information every 2 seconds.
  if (statsElapsed - statsLastTime >= 2) {
    const elapsed = statsElapsed - statsLastTime;

    console.log("Game Performance:", {
      fps: Math.round(statsFrameCount / elapsed),

      drawCalls: renderer.info.render.calls,

      triangles: renderer.info.render.triangles,

      geometries: renderer.info.memory.geometries,

      textures: renderer.info.memory.textures,
    });

    statsFrameCount = 0;
    statsLastTime = statsElapsed;
  }
}

animate();

// Handle browser resizing
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
});
