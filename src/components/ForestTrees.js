import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

// Create our tree model loader.
const loader = new GLTFLoader();

// Enable loading of Meshopt-compressed models.
loader.setMeshoptDecoder(MeshoptDecoder);

// Generate consistent random numbers.
function createRandom(seed = 12345) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Create instanced copies of a tree model.
function addInstancedTrees(forestGroup, model, placements, name) {
  if (placements.length === 0) return;

  // Update the model's world transformations.
  model.updateMatrixWorld(true);

  // Calculate the inverse of the model's root transformation.
  const inverseRoot = model.matrixWorld.clone().invert();

  // Calculate the tree's actual bounds relative to its root.
  const bounds = new THREE.Box3()
    .setFromObject(model)
    .applyMatrix4(inverseRoot);

  // Store the height adjustment needed to put trees on the ground.
  const groundOffset = -bounds.min.y;

  // Group meshes that share the same geometry and materials.
  const meshBuckets = new Map();

  model.traverse((child) => {
    if (!child.isMesh) return;

    // Identify meshes using their geometry and materials.
    const materialKey = Array.isArray(child.material)
      ? child.material.map((material) => material.uuid).join(",")
      : child.material.uuid;

    const key = `${child.geometry.uuid}:${materialKey}`;

    if (!meshBuckets.has(key)) {
      meshBuckets.set(key, {
        geometry: child.geometry,
        material: child.material,
        localMatrices: [],
      });
    }

    // Preserve the mesh's original position within the tree.
    const localMatrix = new THREE.Matrix4().multiplyMatrices(
      inverseRoot,
      child.matrixWorld,
    );

    meshBuckets.get(key).localMatrices.push(localMatrix);
  });

  // Reusable transformation objects.
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scaleVector = new THREE.Vector3();
  const treeMatrix = new THREE.Matrix4();
  const instanceMatrix = new THREE.Matrix4();

  // Create one InstancedMesh for each unique geometry/material group.
  meshBuckets.forEach((bucket) => {
    const instanceCount = placements.length * bucket.localMatrices.length;

    const instancedMesh = new THREE.InstancedMesh(
      bucket.geometry,
      bucket.material,
      instanceCount,
    );

    instancedMesh.name = `${name} Instances`;

    // Forest trees do not cast or receive shadows.
    instancedMesh.castShadow = false;
    instancedMesh.receiveShadow = false;

    let index = 0;

    // Position every copy of this tree.
    placements.forEach((tree) => {
      // Keep the bottom of the tree at ground level.
      position.set(tree.x, groundOffset * tree.scale, tree.z);

      // Apply the individual tree rotation.
      quaternion.setFromAxisAngle(up, tree.rotationY);

      // Apply the individual tree scale.
      scaleVector.setScalar(tree.scale);

      // Build the complete tree transformation.
      treeMatrix.compose(position, quaternion, scaleVector);

      // Preserve the individual transformations of every mesh.
      bucket.localMatrices.forEach((localMatrix) => {
        instanceMatrix.multiplyMatrices(treeMatrix, localMatrix);

        instancedMesh.setMatrixAt(index, instanceMatrix);

        index++;
      });
    });

    // Tell Three.js that our instance transformations have changed.
    instancedMesh.instanceMatrix.needsUpdate = true;

    // Calculate bounds for correct visibility and frustum culling.
    instancedMesh.computeBoundingBox();
    instancedMesh.computeBoundingSphere();

    forestGroup.add(instancedMesh);
  });

  console.log(`${name}: created ${placements.length} tree instances`);
}

// Load and create our surrounding forest.
export async function loadForestTrees() {
  // Load both optimized tree models.
  const [firGLTF, pineGLTF] = await Promise.all([
    loader.loadAsync(
      "/assets/models/fir_tree_01_1k.gltf/fir_tree_01_optimized.glb",
    ),

    loader.loadAsync(
      "/assets/models/pine_tree_01_1k.gltf/pine_tree_01_optimized.glb",
    ),
  ]);

  // Create our forest group.
  const forestGroup = new THREE.Group();

  // Store the two original models.
  const treeModels = [firGLTF.scene, pineGLTF.scene];

  // Store tree positions separately by model.
  const placements = [[], []];

  // Consistent random placement.
  const random = createRandom();

  // Forest settings.
  const treesPerSide = 6;
  const forestMinDistance = 14;
  const forestMaxDistance = 31;
  const forestWidth = 34;

  // Define all four sides of the forest.
  const sides = [
    { axis: "x", sign: -1 },
    { axis: "x", sign: 1 },
    { axis: "z", sign: -1 },
    { axis: "z", sign: 1 },
  ];

  // Populate each side of the playable area.
  sides.forEach((side) => {
    for (let i = 0; i < treesPerSide; i++) {
      // Spread trees along each side with some variation.
      const spacing = (i / (treesPerSide - 1)) * forestWidth * 2;

      const along = -forestWidth + spacing + (random() - 0.5) * 2.2;

      // Keep trees outside the playable area.
      const distance =
        forestMinDistance + random() * (forestMaxDistance - forestMinDistance);

      let x;
      let z;

      if (side.axis === "x") {
        x = side.sign * distance;
        z = along;
      } else {
        x = along;
        z = side.sign * distance;
      }

      // Randomly select fir or pine.
      const modelIndex = Math.floor(random() * treeModels.length);

      // Give every tree a slightly different appearance.
      placements[modelIndex].push({
        x,
        z,
        scale: 0.9 + random() * 0.25,
        rotationY: random() * Math.PI * 2,
      });
    }
  });

  // Create instanced fir trees.
  addInstancedTrees(forestGroup, treeModels[0], placements[0], "Fir Trees");

  // Create instanced pine trees.
  addInstancedTrees(forestGroup, treeModels[1], placements[1], "Pine Trees");

  forestGroup.name = "Forest Trees";

  return forestGroup;
}
