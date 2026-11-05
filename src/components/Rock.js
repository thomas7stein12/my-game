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
