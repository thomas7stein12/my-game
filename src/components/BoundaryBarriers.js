import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Create our 3D model loader.
const loader = new GLTFLoader();

// Load and create barriers around the playable area.
export async function loadBoundaryBarriers() {
  const gltf = await loader.loadAsync(
    "/assets/models/concrete-road-barrier.gltf/concrete_road_barrier_2k.gltf",
  );

  // Keep the original model so we can clone it.
  const barrierModel = gltf.scene;

  // Create a group containing all our barriers.
  const barrierGroup = new THREE.Group();

  // Barrier settings.
  const barrierScale = 1.05;
  const boundary = 9.8;
  const barrierCount = 13;
  const barrierSpacing = 1.5;

  // Calculate the height needed to place the barriers on the ground.
  const sampleBarrier = barrierModel.clone(true);

  sampleBarrier.scale.setScalar(barrierScale);
  sampleBarrier.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(sampleBarrier);

  const groundOffset = -bounds.min.y;

  // Prepare the model to cast and receive shadows.
  barrierModel.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Define all four sides of our playable area.
  const sides = [
    // Front and back.
    { axis: "z", coordinate: -boundary, rotationY: 0 },
    { axis: "z", coordinate: boundary, rotationY: 0 },

    // Left and right.
    { axis: "x", coordinate: -boundary, rotationY: Math.PI / 2 },
    { axis: "x", coordinate: boundary, rotationY: Math.PI / 2 },
  ];

  // Build each side of the barrier.
  sides.forEach((side) => {
    for (let i = 0; i < barrierCount; i++) {
      // Spread the barriers evenly around the center.
      const offset = (i - (barrierCount - 1) / 2) * barrierSpacing;

      // Clone the original barrier.
      const barrier = barrierModel.clone(true);

      barrier.scale.setScalar(barrierScale);
      barrier.rotation.y = side.rotationY;

      // Position the barrier along the current edge.
      if (side.axis === "z") {
        barrier.position.set(offset, groundOffset, side.coordinate);
      } else {
        barrier.position.set(side.coordinate, groundOffset, offset);
      }

      barrierGroup.add(barrier);
    }
  });

  barrierGroup.name = "Boundary Barriers";

  return barrierGroup;
}
