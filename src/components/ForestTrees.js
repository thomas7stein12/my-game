import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { PLAYABLE_AREA_BOUNDARY } from "./WorldDimensions.js";

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

// Share materials between detail levels of the same tree.
// Both models were generated from the same original asset.
function shareTreeMaterials(highDetail, lowDetail) {
  let highMesh = null;
  let lowMesh = null;

  highDetail.traverse((child) => {
    if (child.isMesh) highMesh = child;
  });

  lowDetail.traverse((child) => {
    if (child.isMesh) lowMesh = child;
  });

  if (!highMesh || !lowMesh) {
    throw new Error("Could not find tree meshes to share materials.");
  }

  highMesh.updateMatrixWorld(true);
  lowMesh.updateMatrixWorld(true);

  // Both models have the same six material groups.
  lowMesh.material = highMesh.material;
}

// Calculate the horizontal footprint of a tree model.
function getTreeFootprintRadius(model) {
  model.updateMatrixWorld(true);

  // Convert the model bounds into its local coordinate space.
  const inverseRoot = model.matrixWorld.clone().invert();

  const bounds = new THREE.Box3()
    .setFromObject(model)
    .applyMatrix4(inverseRoot);

  // Find the maximum horizontal distance from the model origin.
  const maxX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));

  const maxZ = Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z));

  // Use a conservative radius that accounts for tree rotation.
  return Math.hypot(maxX, maxZ);
}

// Create instanced copies of a tree model.
function addInstancedTrees(forestGroup, model, placements, name) {
  if (placements.length === 0) return;

  // Update the model's world transformations.
  model.updateMatrixWorld(true);

  // Calculate the inverse of the model's root transformation.
  const inverseRoot = model.matrixWorld.clone().invert();

  // Calculate the tree's actual dimensions.
  const bounds = new THREE.Box3()
    .setFromObject(model)
    .applyMatrix4(inverseRoot);

  // Height adjustment needed to put trees on the ground.
  const groundOffset = -bounds.min.y;

  // Group meshes that share geometry and materials.
  const meshBuckets = new Map();

  model.traverse((child) => {
    if (!child.isMesh) return;

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

  // Create one InstancedMesh for each geometry/material group.
  meshBuckets.forEach((bucket) => {
    const instanceCount = placements.length * bucket.localMatrices.length;

    const instancedMesh = new THREE.InstancedMesh(
      bucket.geometry,
      bucket.material,
      instanceCount,
    );

    instancedMesh.name = `${name} Instances`;

    // Trees do not cast or receive shadows.
    instancedMesh.castShadow = false;
    instancedMesh.receiveShadow = false;

    let index = 0;

    placements.forEach((tree) => {
      // Position the bottom of the tree at ground level.
      position.set(tree.x, groundOffset * tree.scale, tree.z);

      // Apply individual rotation and scale.
      quaternion.setFromAxisAngle(up, tree.rotationY);
      scaleVector.setScalar(tree.scale);

      treeMatrix.compose(position, quaternion, scaleVector);

      // Preserve every original mesh transformation.
      bucket.localMatrices.forEach((localMatrix) => {
        instanceMatrix.multiplyMatrices(treeMatrix, localMatrix);

        instancedMesh.setMatrixAt(index, instanceMatrix);

        index++;
      });
    });

    instancedMesh.instanceMatrix.needsUpdate = true;

    // Calculate bounds for spatial frustum culling.
    instancedMesh.computeBoundingBox();
    instancedMesh.computeBoundingSphere();

    forestGroup.add(instancedMesh);
  });
}

// Load and create our surrounding forest.
export async function loadForestTrees() {
  // Load both tree species at both detail levels.
  const [firHighGLTF, pineHighGLTF, firLowGLTF, pineLowGLTF] =
    await Promise.all([
      loader.loadAsync(
        "/assets/models/fir_tree_01_1k.gltf/fir_tree_01_5pct_test.glb",
      ),

      loader.loadAsync(
        "/assets/models/pine_tree_01_1k.gltf/pine_tree_01_5pct_test.glb",
      ),

      loader.loadAsync(
        "/assets/models/fir_tree_01_1k.gltf/fir_tree_01_2pct_test.glb",
      ),

      loader.loadAsync(
        "/assets/models/pine_tree_01_1k.gltf/pine_tree_01_2pct_test.glb",
      ),
    ]);

  // Reuse the same materials and textures for each species.
  shareTreeMaterials(firHighGLTF.scene, firLowGLTF.scene);
  shareTreeMaterials(pineHighGLTF.scene, pineLowGLTF.scene);

  // Store models by detail level and species.
  const models = {
    near: [firHighGLTF.scene, pineHighGLTF.scene],

    far: [firLowGLTF.scene, pineLowGLTF.scene],
  };

  // TEST: Enable back-face culling on distant pine foliage.
  models.far[1].traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      if (material?.name === "pine_tree_01_twig") {
        material.side = THREE.FrontSide;
        material.needsUpdate = true;
      }
    });
  });

  // TEST: Enable back-face culling on distant fir foliage.
  models.far[0].traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      if (material?.name === "fir_tree_01_twig") {
        material.side = THREE.FrontSide;
        material.needsUpdate = true;
      }
    });
  });

  // TEST: Enable back-face culling on nearby pine foliage.
  models.near[1].traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      if (material?.name === "pine_tree_01_twig") {
        material.side = THREE.FrontSide;
        material.needsUpdate = true;
      }
    });
  });

  function logTreeMeshBreakdown(label, model) {
    const meshStats = [];

    model.traverse((object) => {
      if (!object.isMesh || !object.geometry) return;

      const geometry = object.geometry;

      const triangles = geometry.index
        ? geometry.index.count / 3
        : geometry.attributes.position.count / 3;

      meshStats.push({
        mesh: object.name || "Unnamed mesh",
        triangles: Math.round(triangles),
        vertices: geometry.attributes.position.count,
        material: Array.isArray(object.material)
          ? object.material.map((m) => m.name).join(", ")
          : object.material?.name || "Unnamed material",
      });
    });

    meshStats.sort((a, b) => b.triangles - a.triangles);

    console.group(`${label} Mesh Breakdown`);
    console.table(meshStats);
    console.groupEnd();
  }

  // Calculate the footprint of each tree model.
  const modelFootprints = {
    near: models.near.map(getTreeFootprintRadius),
    far: models.far.map(getTreeFootprintRadius),
  };

  const forestGroup = new THREE.Group();

  // Store placements in separate spatial batches.
  const batches = new Map();

  const random = createRandom();

  // Forest density settings.
  const rows = [
    {
      tier: "near",
      treesPerSide: 8,
      minDistance: 14,
      maxDistance: 18,
      halfWidth: 25,
    },
    {
      tier: "far",
      treesPerSide: 10,
      minDistance: 22,
      maxDistance: 29,
      halfWidth: 34,
    },
  ];

  // Boundary and clearance settings.
  const boundary = PLAYABLE_AREA_BOUNDARY;
  const boundaryClearance = 1.0;

  // Four sides surrounding the playable area.
  const sides = [
    { axis: "x", sign: -1, name: "West" },
    { axis: "x", sign: 1, name: "East" },
    { axis: "z", sign: -1, name: "North" },
    { axis: "z", sign: 1, name: "South" },
  ];

  // Generate tree positions.
  sides.forEach((side, sideIndex) => {
    rows.forEach((row, rowIndex) => {
      const spacing = (row.halfWidth * 2) / row.treesPerSide;

      for (let i = 0; i < row.treesPerSide; i++) {
        // Spread trees along the current side.
        const baseAlong = -row.halfWidth + spacing * (i + 0.5);

        // Offset the outer row to fill gaps.
        const stagger = rowIndex === 1 ? spacing * 0.5 : 0;

        const along = THREE.MathUtils.clamp(
          baseAlong + stagger + (random() - 0.5) * 1.8,
          -row.halfWidth,
          row.halfWidth,
        );

        // Choose the tree species and its individual scale.
        const species = Math.floor(random() * 2);
        const scale = 0.9 + random() * 0.25;

        // Choose the preferred position from our existing distance range.
        const preferredDistance =
          row.minDistance + random() * (row.maxDistance - row.minDistance);

        // Calculate the actual horizontal footprint of this tree.
        const treeFootprintRadius = modelFootprints[row.tier][species] * scale;

        // Calculate the minimum distance needed to keep the entire tree
        // outside the boundary, including an extra clearance.
        const minimumDistance =
          boundary + boundaryClearance + treeFootprintRadius;

        // Never allow a tree to spawn closer than its safe distance.
        const distance = Math.max(preferredDistance, minimumDistance);

        let x;
        let z;

        if (side.axis === "x") {
          x = side.sign * distance;
          z = along;
        } else {
          x = along;
          z = side.sign * distance;
        }

        // Split each side into two spatial sections.
        const segment = along < 0 ? 0 : 1;

        // Create a separate batch for each side, segment,
        // detail level, and tree species.
        const batchKey = `${row.tier}|${sideIndex}|${segment}|${species}`;

        if (!batches.has(batchKey)) {
          batches.set(batchKey, []);
        }

        batches.get(batchKey).push({
          x,
          z,

          // Use the scale already included in our boundary calculation.
          scale,

          rotationY: random() * Math.PI * 2,
        });
      }
    });
  });

  logTreeMeshBreakdown("Near Fir", models.near[0]);
  logTreeMeshBreakdown("Near Pine", models.near[1]);
  logTreeMeshBreakdown("Far Fir", models.far[0]);
  logTreeMeshBreakdown("Far Pine", models.far[1]);

  function logTwigMaterialDetails(label, model) {
    model.traverse((object) => {
      if (!object.isMesh || !object.geometry) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material?.name?.toLowerCase().includes("twig")) return;

        console.log(`${label} Twig Material:`, {
          mesh: object.name,
          material: material.name,
          type: material.type,
          transparent: material.transparent,
          opacity: material.opacity,
          alphaTest: material.alphaTest,
          alphaMap: Boolean(material.alphaMap),
          textureMap: Boolean(material.map),
          vertexColors: material.vertexColors,
          side: material.side,
          depthWrite: material.depthWrite,
        });
      });
    });
  }

  logTwigMaterialDetails("Near Fir", models.near[0]);
  logTwigMaterialDetails("Near Pine", models.near[1]);
  logTwigMaterialDetails("Far Fir", models.far[0]);
  logTwigMaterialDetails("Far Pine", models.far[1]);

  // --------------------------------------------------
  // PREPARE INDEPENDENT TREE WORLD CHUNKS.
  // --------------------------------------------------

  const treeChunkSize = 25;
  const groundHalfSize = 50;

  // Store tree placements by their actual world coordinates.
  const worldChunks = new Map();

  batches.forEach((placements, key) => {
    const [tier, , , species] = key.split("|");

    placements.forEach((tree) => {
      // Find the world chunk containing this tree.
      const chunkX = Math.floor((tree.x + groundHalfSize) / treeChunkSize);

      const chunkZ = Math.floor((tree.z + groundHalfSize) / treeChunkSize);

      const chunkKey = `${chunkX}|${chunkZ}`;

      let chunk = worldChunks.get(chunkKey);

      // Create the chunk description if needed.
      if (!chunk) {
        const minX = chunkX * treeChunkSize - groundHalfSize;
        const minZ = chunkZ * treeChunkSize - groundHalfSize;

        chunk = {
          chunkX,
          chunkZ,

          batches: new Map(),

          group: null,

          bounds: new THREE.Box3(),
        };

        worldChunks.set(chunkKey, chunk);
      }

      // Calculate this individual tree's actual footprint.
      const treeFootprintRadius =
        modelFootprints[tier][Number(species)] * tree.scale;

      // Expand the chunk bounds around the actual tree position.
      chunk.bounds.expandByPoint(
        new THREE.Vector3(
          tree.x - treeFootprintRadius,
          -1,
          tree.z - treeFootprintRadius,
        ),
      );

      chunk.bounds.expandByPoint(
        new THREE.Vector3(
          tree.x + treeFootprintRadius,
          30,
          tree.z + treeFootprintRadius,
        ),
      );

      // Keep different species and detail levels separate.
      const batchKey = `${tier}|${species}`;

      if (!chunk.batches.has(batchKey)) {
        chunk.batches.set(batchKey, []);
      }

      chunk.batches.get(batchKey).push(tree);
    });
  });

  // --------------------------------------------------
  // LOAD ONE TREE CHUNK.
  // --------------------------------------------------

  function loadChunk(chunkKey) {
    const chunk = worldChunks.get(chunkKey);

    if (!chunk || chunk.group) return;

    const chunkGroup = new THREE.Group();

    chunkGroup.name = `Tree World Chunk ${chunk.chunkX}-${chunk.chunkZ}`;

    chunk.batches.forEach((placements, batchKey) => {
      const [tier, species] = batchKey.split("|");

      const model = models[tier][Number(species)];

      const speciesName = Number(species) === 0 ? "Fir" : "Pine";

      addInstancedTrees(
        chunkGroup,
        model,
        placements,
        `${chunk.chunkX}-${chunk.chunkZ} ${tier} ${speciesName}`,
      );
    });

    chunk.group = chunkGroup;

    forestGroup.add(chunkGroup);
  }

  // --------------------------------------------------
  // UNLOAD ONE TREE CHUNK.
  // --------------------------------------------------

  function unloadChunk(chunkKey) {
    const chunk = worldChunks.get(chunkKey);

    if (!chunk || !chunk.group) return;

    forestGroup.remove(chunk.group);

    // Dispose of instance-specific GPU resources.
    // Shared tree geometry and materials stay available.
    chunk.group.traverse((object) => {
      if (object.isInstancedMesh) {
        object.dispose();
      }
    });

    chunk.group = null;
  }

  const totalTrees = [...batches.values()].reduce(
    (total, placements) => total + placements.length,
    0,
  );

  forestGroup.name = "Forest Trees";

  console.log(
    `Forest trees prepared: ${totalTrees} trees across ` +
      `${worldChunks.size} world chunks.`,
  );

  return {
    group: forestGroup,
    chunks: worldChunks,
    loadChunk,
    unloadChunk,
  };
}

const sideNames = ["West", "East", "North", "South"];
