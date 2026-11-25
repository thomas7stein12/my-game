import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  CLIFF_BASE_Z,
  FOREST_APEX_Z,
  CLIFF_BASE_WIDTH,
  GROUND_HALF_SIZE,
  FOREST_EDGE_SEGMENTS,
  isInsidePlayableArea,
  distanceToSegmentXZ,
} from "./WorldDimensions.js";

// Create our grass model loader.
const loader = new GLTFLoader();

// Enable loading of Meshopt-compressed models.
loader.setMeshoptDecoder(MeshoptDecoder);

// Generate consistent random numbers.
function createRandom(seed = 24680) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Convert quantized vertex attributes to floating-point values.
function convertVectorAttributeToFloat(geometry, attributeName) {
  const attribute = geometry.getAttribute(attributeName);

  if (!attribute || attribute.array instanceof Float32Array) {
    return;
  }

  const values = new Float32Array(attribute.count * 3);

  for (let i = 0; i < attribute.count; i++) {
    values[i * 3] = attribute.getX(i);
    values[i * 3 + 1] = attribute.getY(i);
    values[i * 3 + 2] = attribute.getZ(i);
  }

  geometry.setAttribute(
    attributeName,
    new THREE.Float32BufferAttribute(values, 3),
  );
}

// Calculate the horizontal footprint of a geometry.
function getGrassFootprint(geometry) {
  const bounds = geometry.boundingBox;

  const maxX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));

  const maxZ = Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z));

  return Math.hypot(maxX, maxZ);
}

// Create eight reusable grass cluster designs.
function createGrassClusters(grassVariants, random) {
  // Ignore the six extremely tiny grass variations.
  const usableVariants = grassVariants.filter(
    (variant) => !variant.name.toLowerCase().includes("tiny"),
  );

  if (usableVariants.length === 0) {
    throw new Error("No usable grass variations were found.");
  }

  const clusterCount = 8;
  const piecesPerCluster = 4;

  const clusterVariants = [];

  // Reusable transformation objects.
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scaleVector = new THREE.Vector3();
  const matrix = new THREE.Matrix4();

  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
    const pieces = [];

    // Assemble four different grass models into one cluster.
    for (let pieceIndex = 0; pieceIndex < piecesPerCluster; pieceIndex++) {
      // Select a full-size grass variation.
      const variantIndex = Math.floor(random() * usableVariants.length);

      const variant = usableVariants[variantIndex];

      // Make individual grass models larger.
      const plantScale = 2.1 + random() * 0.7;

      // Position one plant in the middle and the others around it.
      const angle =
        ((pieceIndex - 1) * Math.PI * 2) / (piecesPerCluster - 1) +
        (random() - 0.5) * 0.7;

      const spread = pieceIndex === 0 ? 0 : 0.12 + random() * 0.16;

      // Clone the original grass geometry.
      const geometry = variant.geometry.clone();

      // Position the bottom of the grass at ground level.
      position.set(
        Math.cos(angle) * spread,
        -variant.minY * plantScale,
        Math.sin(angle) * spread,
      );

      // Randomize the direction of each plant.
      quaternion.setFromAxisAngle(up, random() * Math.PI * 2);

      scaleVector.setScalar(plantScale);

      matrix.compose(position, quaternion, scaleVector);

      geometry.applyMatrix4(matrix);

      pieces.push(geometry);
    }

    // Merge all four grass models into one geometry.
    const mergedGeometry = mergeGeometries(pieces, false);

    // Release the temporary geometry copies.
    pieces.forEach((geometry) => geometry.dispose());

    if (!mergedGeometry) {
      throw new Error("Could not merge the grass cluster geometries.");
    }

    // Center the cluster horizontally.
    mergedGeometry.computeBoundingBox();

    const center = new THREE.Vector3();

    mergedGeometry.boundingBox.getCenter(center);

    mergedGeometry.translate(-center.x, 0, -center.z);

    // Calculate the final cluster bounds.
    mergedGeometry.computeBoundingBox();
    mergedGeometry.computeBoundingSphere();

    clusterVariants.push({
      geometry: mergedGeometry,
      footprintRadius: getGrassFootprint(mergedGeometry),
    });
  }

  return clusterVariants;
}

// Load and distribute grass throughout the playable world.
export async function loadForestGrass() {
  // Use the already-tested optimized grass model.
  const gltf = await loader.loadAsync(
    "/assets/models/grass_medium_01_1k.gltf/grass_medium_01_15pct_kn.glb",
  );

  const grassModel = gltf.scene;

  grassModel.updateMatrixWorld(true);

  const grassVariants = [];

  let sourceMaterial = null;

  // Extract all individual grass variations.
  grassModel.traverse((child) => {
    if (!child.isMesh) return;

    const variantRoot = child.parent;

    const childMaterial = Array.isArray(child.material)
      ? child.material[0]
      : child.material;

    if (!sourceMaterial) {
      sourceMaterial = childMaterial;
    }

    // Get the mesh transformation relative to its own variant root.
    // This preserves the mesh's internal translation and scale
    // without retaining its original side-by-side arrangement.
    const inverseVariantRoot = variantRoot.matrixWorld.clone().invert();

    const localMatrix = new THREE.Matrix4().multiplyMatrices(
      inverseVariantRoot,
      child.matrixWorld,
    );

    // Clone the original geometry.
    const geometry = child.geometry.clone();

    // Prevent quantized positions from being truncated.
    convertVectorAttributeToFloat(geometry, "position");
    convertVectorAttributeToFloat(geometry, "normal");

    // Apply the model's actual transformation.
    geometry.applyMatrix4(localMatrix);

    // Calculate the original dimensions.
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // Center the grass horizontally without changing its height.
    const center = new THREE.Vector3();

    geometry.boundingBox.getCenter(center);

    geometry.translate(-center.x, 0, -center.z);

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const bounds = geometry.boundingBox;

    grassVariants.push({
      name: variantRoot.name || child.name,
      geometry,
      minY: bounds.min.y,
    });
  });

  if (!sourceMaterial?.map || grassVariants.length !== 17) {
    throw new Error(
      `Expected 17 grass variations but found ${grassVariants.length}.`,
    );
  }

  // Keep the existing grass color texture.
  const grassMap = sourceMaterial.map;

  grassMap.colorSpace = THREE.SRGBColorSpace;

  // Release unused texture maps.
  const unusedTextures = new Set([
    sourceMaterial.normalMap,
    sourceMaterial.roughnessMap,
    sourceMaterial.metalnessMap,
    sourceMaterial.aoMap,
  ]);

  unusedTextures.forEach((texture) => {
    if (texture && texture !== grassMap) {
      texture.dispose();
    }
  });

  // Release the original material.
  sourceMaterial.dispose();

  // We have independent copies of all the source geometry.
  grassModel.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
    }
  });

  // Generate consistent randomness for the distribution.
  const random = createRandom();

  // Build our eight reusable cluster geometries.
  const clusterVariants = createGrassClusters(grassVariants, random);

  // Release the original individual grass geometries.
  grassVariants.forEach((variant) => {
    variant.geometry.dispose();
  });

  // One shared material for all grass clusters.
  const grassMaterial = new THREE.MeshStandardMaterial({
    map: grassMap,
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
  });

  const grassGroup = new THREE.Group();

  grassGroup.name = "Forest Grass";

  // Original forest ground dimensions.
  const groundHalfSize = GROUND_HALF_SIZE;

  // Keep the same spacing and random distribution.
  const edgeClearance = 0.65;

  const outerSpacing = 1.45;
  const innerSpacing = 0.72;

  // Keep the original cluster size variation.
  const minimumClusterScale = 0.9;
  const maximumClusterScale = 1.45;

  // Divide the world into independently culled sections.
  const chunkSize = 25;

  // Find the largest cluster footprint for chunk bounds.
  const largestFootprint = Math.max(
    ...clusterVariants.map((cluster) => cluster.footprintRadius),
  );

  // Grass can grow outside both forest-facing sides.
  // There is deliberately no grass behind the cliff.
  const forestBandWidth = 28;

  // Organize grass by spatial chunk and cluster design.
  const chunkBatches = new Map();

  // Check whether a grass cluster fits within the
  // original visible ground.
  function isInsideGround(x, z, margin) {
    return (
      x >= -groundHalfSize + margin &&
      x <= groundHalfSize - margin &&
      z >= CLIFF_BASE_Z + margin &&
      z <= groundHalfSize - margin
    );
  }

  // Dense grass inside the triangular clearing.
  function canPlaceInnerGrass(x, z, margin) {
    return isInsideGround(x, z, margin) && isInsidePlayableArea(x, z, margin);
  }

  // More open grass outside the two forest boundaries.
  function canPlaceOuterGrass(x, z, margin) {
    if (!isInsideGround(x, z, margin)) {
      return false;
    }

    // Never place outer grass inside the clearing.
    if (isInsidePlayableArea(x, z)) {
      return false;
    }

    // Leave the area behind the cliff empty.
    if (z < CLIFF_BASE_Z + margin) {
      return false;
    }

    // Find the closest of the two forest boundaries.
    let nearestEdge = Infinity;

    FOREST_EDGE_SEGMENTS.forEach(([start, end]) => {
      const distance = distanceToSegmentXZ(x, z, start, end);

      nearestEdge = Math.min(nearestEdge, distance);
    });

    // Keep the grass within the surrounding forest bands.
    return nearestEdge <= forestBandWidth - margin;
  }

  // Add an individual grass cluster.
  function addGrassCluster(baseX, baseZ, spacing, canPlace) {
    const clusterIndex = Math.floor(random() * clusterVariants.length);

    const cluster = clusterVariants[clusterIndex];

    // Randomize overall cluster size.
    const scale =
      minimumClusterScale +
      random() * (maximumClusterScale - minimumClusterScale);

    const rotationY = random() * Math.PI * 2;

    // Preserve the original natural positioning variation.
    const jitterX = (random() - 0.5) * spacing * 0.45;
    const jitterZ = (random() - 0.5) * spacing * 0.45;

    const x = baseX + jitterX;
    const z = baseZ + jitterZ;

    // Keep the entire grass cluster safely within
    // its appropriate region.
    const requiredMargin = edgeClearance + cluster.footprintRadius * scale;

    if (!canPlace(x, z, requiredMargin)) {
      return;
    }

    // Determine which 25 x 25 section contains this cluster.
    const chunkX = Math.floor((x + groundHalfSize) / chunkSize);

    const chunkZ = Math.floor((z + groundHalfSize) / chunkSize);

    // Group by chunk and cluster design.
    const batchKey = `${chunkX}|${chunkZ}|${clusterIndex}`;

    if (!chunkBatches.has(batchKey)) {
      chunkBatches.set(batchKey, []);
    }

    chunkBatches.get(batchKey).push({
      x,
      z,
      scale,
      rotationY,
    });
  }

  // --------------------------------------------------
  // INNER GRASS: TRIANGULAR CLEARING
  // --------------------------------------------------

  // Keep the existing dense spacing and natural gaps.
  for (
    let x = -CLIFF_BASE_WIDTH / 2;
    x <= CLIFF_BASE_WIDTH / 2;
    x += innerSpacing
  ) {
    for (let z = CLIFF_BASE_Z; z <= FOREST_APEX_Z; z += innerSpacing) {
      if (random() < 0.08) continue;

      const scatteredX = x + (random() - 0.5) * innerSpacing * 1.2;

      const scatteredZ = z + (random() - 0.5) * innerSpacing * 1.2;

      addGrassCluster(scatteredX, scatteredZ, innerSpacing, canPlaceInnerGrass);
    }
  }

  // --------------------------------------------------
  // OUTER GRASS: TWO FOREST BOUNDARIES
  // --------------------------------------------------

  // Maintain the original more open outer grass density.
  // Only populate the forest-facing portions of the ground.
  for (let x = -groundHalfSize; x <= groundHalfSize; x += outerSpacing) {
    for (let z = CLIFF_BASE_Z; z <= groundHalfSize; z += outerSpacing) {
      if (random() < 0.18) continue;

      const scatteredX = x + (random() - 0.5) * outerSpacing * 1.35;

      const scatteredZ = z + (random() - 0.5) * outerSpacing * 1.35;

      addGrassCluster(scatteredX, scatteredZ, outerSpacing, canPlaceOuterGrass);
    }
  }

  // --------------------------------------------------
  // PREPARE INDEPENDENT WORLD GRASS CHUNKS.
  // --------------------------------------------------

  let totalClusters = 0;
  let totalTriangles = 0;

  // Store chunk data separately from the actual meshes.
  const worldChunks = new Map();

  // Organize the existing grass placements into world chunks.
  chunkBatches.forEach((placements, key) => {
    const [chunkX, chunkZ, clusterIndex] = key.split("|").map(Number);

    const chunkKey = `${chunkX}|${chunkZ}`;

    let chunk = worldChunks.get(chunkKey);

    // Create the chunk description once.
    if (!chunk) {
      const chunkMinX = chunkX * chunkSize - groundHalfSize;
      const chunkMinZ = chunkZ * chunkSize - groundHalfSize;

      const margin = largestFootprint * maximumClusterScale;

      chunk = {
        chunkX,
        chunkZ,

        // Store grass placements by cluster variation.
        batches: new Map(),

        // Actual meshes are created only when loaded.
        group: null,

        // Define the actual world-space area covered by this grass chunk.
        bounds: new THREE.Box3(
          new THREE.Vector3(chunkMinX - margin, -1, chunkMinZ - margin),
          new THREE.Vector3(
            chunkMinX + chunkSize + margin,
            30,
            chunkMinZ + chunkSize + margin,
          ),
        ),
      };

      worldChunks.set(chunkKey, chunk);
    }

    chunk.batches.set(clusterIndex, placements);

    // Count the total potential grass workload.
    const cluster = clusterVariants[clusterIndex];

    const index = cluster.geometry.getIndex();

    const trianglesPerCluster = index
      ? index.count / 3
      : cluster.geometry.getAttribute("position").count / 3;

    totalTriangles += trianglesPerCluster * placements.length;
    totalClusters += placements.length;
  });

  // --------------------------------------------------
  // LOAD ONE GRASS CHUNK.
  // --------------------------------------------------

  function loadChunk(chunkKey) {
    const chunk = worldChunks.get(chunkKey);

    if (!chunk || chunk.group) return;

    const chunkGroup = new THREE.Group();

    chunkGroup.name = `Grass World Chunk ${chunk.chunkX}-${chunk.chunkZ}`;

    // Reusable transformation objects.
    const up = new THREE.Vector3(0, 1, 0);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scaleVector = new THREE.Vector3();
    const matrix = new THREE.Matrix4();

    // Build the individual grass variations for this chunk.
    chunk.batches.forEach((placements, clusterIndex) => {
      const cluster = clusterVariants[clusterIndex];

      const instancedMesh = new THREE.InstancedMesh(
        cluster.geometry,
        grassMaterial,
        placements.length,
      );

      instancedMesh.name = `Grass Chunk ${chunk.chunkX}-${chunk.chunkZ} Variant ${clusterIndex}`;

      instancedMesh.castShadow = false;
      instancedMesh.receiveShadow = false;

      instancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

      placements.forEach((grass, index) => {
        position.set(grass.x, 0, grass.z);

        quaternion.setFromAxisAngle(up, grass.rotationY);

        scaleVector.setScalar(grass.scale);

        matrix.compose(position, quaternion, scaleVector);

        instancedMesh.setMatrixAt(index, matrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;

      // Calculate bounds for frustum culling.
      instancedMesh.computeBoundingBox();
      instancedMesh.computeBoundingSphere();

      chunkGroup.add(instancedMesh);
    });

    // Store the completed chunk.
    chunk.group = chunkGroup;

    // Add it to the main grass environment.
    grassGroup.add(chunkGroup);
  }

  // --------------------------------------------------
  // UNLOAD ONE GRASS CHUNK.
  // --------------------------------------------------

  function unloadChunk(chunkKey) {
    const chunk = worldChunks.get(chunkKey);

    if (!chunk || !chunk.group) return;

    // Remove the chunk from the active scene.
    grassGroup.remove(chunk.group);

    // Release its individual GPU instance resources.
    chunk.group.traverse((object) => {
      if (object.isInstancedMesh) {
        object.dispose();
      }
    });

    // Release the chunk's mesh references.
    chunk.group = null;
  }

  console.log(
    `Forest grass prepared: ${totalClusters} clusters, ` +
      `${totalClusters * 4} individual plants, ` +
      `${totalTriangles.toLocaleString()} potential triangles, ` +
      `${worldChunks.size} world chunks.`,
  );

  // Return everything needed by the world chunk manager.
  return {
    group: grassGroup,
    chunks: worldChunks,
    loadChunk,
    unloadChunk,
  };
}
