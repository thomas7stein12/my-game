import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Create a loader for our 3D models.
const loader = new GLTFLoader();

// Load our boulder model.
export function loadRockModel() {
  return loader
    .loadAsync(
      "/assets/models/namaqualand-boulder/namaqualand_boulder_03_2k.gltf",
    )
    .then((gltf) => {
      const rockModel = gltf.scene;

      // Allow the rock to cast and receive shadows.
      rockModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      return rockModel;
    });
}

// Create a new instance of our boulder.
export function addRock(scene, model, options = {}) {
  const {
    position = { x: 0, y: 0, z: 0 },
    scale = 1,
    rotationY = 0,
    topY,
  } = options;

  // Clone the original model.
  const rock = model.clone(true);

  // Adjust its size and rotation.
  rock.scale.setScalar(scale);
  rock.rotation.y = rotationY;

  // Set its horizontal position.
  rock.position.set(position.x, 0, position.z);

  // Calculate the actual dimensions of the model.
  rock.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(rock);

  if (topY !== undefined) {
    // Align the highest point of the rock with the requested height.
    rock.position.y += topY - bounds.max.y;
  } else {
    // Otherwise, place the bottom of the rock at position.y.
    rock.position.y += position.y - bounds.min.y;
  }

  rock.updateMatrixWorld(true);

  // Add the rock to our game world.
  scene.add(rock);

  return rock;
}

// Calculate the actual height of a rock at a given scale.
function getRockHeight(model, scale, rotationY) {
  const sample = model.clone(true);

  sample.scale.setScalar(scale);
  sample.rotation.y = rotationY;

  sample.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(sample);

  return bounds.getSize(new THREE.Vector3()).y;
}

// Create decorative rocks underneath a playable boulder.
// These rocks are visual only and have no collision detection.
export function addRockSupport(scene, model, options = {}) {
  const {
    position = { x: 0, z: 0 },
    topY = 0,
    scale = 1,
    rotationY = 0,
  } = options;

  // Calculate where the bottom of the main boulder sits.
  const mainRockHeight = getRockHeight(model, scale, rotationY);

  const mainRockBottom = topY - mainRockHeight;

  // Smaller support rocks give the main boulder something to sit on.
  const supportScale = scale * 0.88;

  const supportHeight = getRockHeight(model, supportScale, rotationY);

  // No support is needed if the main rock already reaches the ground.
  if (mainRockBottom <= 0.1) {
    return [];
  }

  // Overlap the rocks slightly so they look like a natural formation.
  const overlap = supportHeight * 0.3;

  // Small position changes prevent every rock from lining up perfectly.
  const offsets = [
    { x: 0, z: 0 },
    { x: -0.2, z: 0.15 },
    { x: 0.2, z: -0.15 },
    { x: -0.15, z: -0.2 },
    { x: 0.15, z: 0.2 },
  ];

  const supportRocks = [];

  let currentTop = 0;
  let index = 0;

  // Keep stacking rocks until we reach the main boulder's bottom.
  while (currentTop < mainRockBottom && index < 8) {
    const offset = offsets[index % offsets.length];

    // Put the first rock directly on the ground.
    // Each additional rock overlaps the one underneath it.
    const bottomY = index === 0 ? 0 : currentTop - overlap;

    const supportRock = addRock(scene, model, {
      position: {
        x: position.x + offset.x,
        y: bottomY,
        z: position.z + offset.z,
      },

      scale: supportScale,

      // Rotate each rock differently.
      rotationY: rotationY + index * 1.2,
    });

    supportRocks.push(supportRock);

    // Calculate the new top of our rock formation.
    currentTop = bottomY + supportHeight;

    index++;
  }

  return supportRocks;
}
