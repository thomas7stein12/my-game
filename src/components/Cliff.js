import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import {
  CLIFF_BASE_Z,
  CLIFF_WALL_WIDTH,
  CLIFF_WALL_HEIGHT,
} from "./WorldDimensions.js";

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Repeatable randomness.
function createRandom(seed = 87654) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Load the marble cliff textures.
async function loadCliffMaterial() {
  const folder = "/assets/textures/cliff/textures/";

  const [diffuseMap, normalMap, roughnessMap] = await Promise.all([
    textureLoader.loadAsync(`${folder}marble_cliff_03_diff_1k.jpg`),
    textureLoader.loadAsync(`${folder}marble_cliff_03_nor_gl_1k.jpg`),
    textureLoader.loadAsync(`${folder}marble_cliff_03_arm_1k.jpg`),
  ]);

  diffuseMap.colorSpace = THREE.SRGBColorSpace;

  normalMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.colorSpace = THREE.NoColorSpace;

  // The main cliff repeats its texture every 7 units.
  const tileSize = 7;

  [diffuseMap, normalMap, roughnessMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    texture.repeat.set(
      CLIFF_WALL_WIDTH / tileSize,
      CLIFF_WALL_HEIGHT / tileSize,
    );

    texture.needsUpdate = true;
  });

  return new THREE.MeshStandardMaterial({
    map: diffuseMap,
    normalMap,
    roughnessMap,

    roughness: 1,
    metalness: 0,

    normalScale: new THREE.Vector2(0.8, 0.8),

    side: THREE.FrontSide,
  });
}

// Create a matching material for the protruding formations.
function createDetailMaterial(wallMaterial, modelSize) {
  const material = wallMaterial.clone();

  // Smaller texture repetition for the smaller formations.
  const referenceScale = 0.16;
  const tileSize = 7;

  ["map", "normalMap", "roughnessMap"].forEach((property) => {
    const originalTexture = wallMaterial[property];

    if (!originalTexture) return;

    // Clone the texture settings without changing the wall.
    const texture = originalTexture.clone();

    texture.repeat.set(
      (modelSize.x * referenceScale) / tileSize,
      (modelSize.y * referenceScale) / tileSize,
    );

    texture.needsUpdate = true;

    material[property] = texture;
  });

  // Keep all sides of the actual rock formations visible.
  material.side = THREE.DoubleSide;

  // Slightly stronger normal detail on protruding surfaces.
  material.normalScale.set(1.0, 1.0);

  material.needsUpdate = true;

  return material;
}

// Create the main continuous cliff wall.
function createCliffWall(material) {
  const geometry = new THREE.PlaneGeometry(CLIFF_WALL_WIDTH, CLIFF_WALL_HEIGHT);

  const wall = new THREE.Mesh(geometry, material);

  wall.name = "Textured Marble Cliff Wall";

  wall.position.set(0, CLIFF_WALL_HEIGHT / 2, CLIFF_BASE_Z - 0.3);

  wall.castShadow = false;
  wall.receiveShadow = true;

  return wall;
}

// Create randomized formations throughout the entire cliff.
function createDetailPlacements(modelSize, wallZ) {
  const random = createRandom();

  // 12 columns x 4 rows = 48 formations.
  const columns = 12;
  const rows = 4;

  const horizontalMargin = 8;
  const verticalMargin = 1.3;

  const horizontalSpacing =
    (CLIFF_WALL_WIDTH - horizontalMargin * 2) / (columns - 1);

  const verticalSpacing = (CLIFF_WALL_HEIGHT - verticalMargin * 2) / (rows - 1);

  const placements = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      // Slightly stagger alternate rows.
      const rowOffset = row % 2 === 0 ? 0 : horizontalSpacing * 0.35;

      const baseX =
        -CLIFF_WALL_WIDTH / 2 +
        horizontalMargin +
        column * horizontalSpacing +
        rowOffset;

      // Random positioning prevents a regular grid appearance.
      const x = THREE.MathUtils.clamp(
        baseX + (random() - 0.5) * horizontalSpacing * 0.4,
        -CLIFF_WALL_WIDTH / 2 + horizontalMargin,
        CLIFF_WALL_WIDTH / 2 - horizontalMargin,
      );

      const baseY = verticalMargin + row * verticalSpacing;

      const y = THREE.MathUtils.clamp(
        baseY + (random() - 0.5) * 1.3,
        verticalMargin,
        CLIFF_WALL_HEIGHT - verticalMargin,
      );

      // Most formations are small, with a few larger accents.
      const scale =
        random() < 0.18 ? 0.19 + random() * 0.035 : 0.12 + random() * 0.08;

      // Keep the mountainside's broad face toward the player.
      // Avoid the old completely random 360-degree rotation.
      const rotation = new THREE.Euler(
        (random() - 0.5) * 0.12,
        (random() - 0.5) * 0.36,
        (random() - 0.5) * 0.12,
        "YXZ",
      );

      // Embed part of each formation into the wall.
      // This prevents the floating appearance.
      const detailDepth = modelSize.z * scale;

      const z = wallZ + detailDepth * 0.32;

      placements.push({
        position: new THREE.Vector3(x, y, z),

        quaternion: new THREE.Quaternion().setFromEuler(rotation),

        scale,
      });
    }
  }

  return placements;
}

// Add the actual mountainside geometry.
function addMountainsideDetails(cliffGroup, model, wallMaterial, wallZ) {
  model.updateMatrixWorld(true);

  const inverseRoot = model.matrixWorld.clone().invert();

  // Calculate original model dimensions.
  const bounds = new THREE.Box3()
    .setFromObject(model)
    .applyMatrix4(inverseRoot);

  const modelSize = bounds.getSize(new THREE.Vector3());

  const modelCenter = bounds.getCenter(new THREE.Vector3());

  // Center every instance around its placement.
  const centerOffset = new THREE.Matrix4().makeTranslation(
    -modelCenter.x,
    -modelCenter.y,
    -modelCenter.z,
  );

  // Prepare the matching marble material.
  const detailMaterial = createDetailMaterial(wallMaterial, modelSize);

  // Preserve all original mesh transformations.
  const meshEntries = [];

  model.traverse((object) => {
    if (!object.isMesh) return;

    const localMatrix = new THREE.Matrix4().multiplyMatrices(
      inverseRoot,
      object.matrixWorld,
    );

    const centeredMatrix = new THREE.Matrix4().multiplyMatrices(
      centerOffset,
      localMatrix,
    );

    meshEntries.push({
      geometry: object.geometry,
      localMatrix: centeredMatrix,
    });
  });

  if (meshEntries.length === 0) {
    throw new Error("No mountainside meshes found.");
  }

  // Generate formations across the entire wall.
  const placements = createDetailPlacements(modelSize, wallZ);

  // Reusable transformations.
  const scaleVector = new THREE.Vector3();

  const placementMatrix = new THREE.Matrix4();
  const instanceMatrix = new THREE.Matrix4();

  // Create an InstancedMesh for every source mesh.
  meshEntries.forEach((entry) => {
    const instances = new THREE.InstancedMesh(
      entry.geometry,
      detailMaterial,
      placements.length,
    );

    instances.name = "Mountainside Cliff Formations";

    instances.castShadow = false;
    instances.receiveShadow = true;

    instances.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    placements.forEach((placement, index) => {
      scaleVector.setScalar(placement.scale);

      placementMatrix.compose(
        placement.position,
        placement.quaternion,
        scaleVector,
      );

      instanceMatrix.multiplyMatrices(placementMatrix, entry.localMatrix);

      instances.setMatrixAt(index, instanceMatrix);
    });

    instances.instanceMatrix.needsUpdate = true;

    instances.computeBoundingBox();
    instances.computeBoundingSphere();

    cliffGroup.add(instances);
  });

  console.log("Cliff formations distributed:", {
    count: placements.length,
    wallWidth: CLIFF_WALL_WIDTH,
    wallHeight: CLIFF_WALL_HEIGHT,
    modelTriangles: modelSize,
  });
}

// Load the complete cliff.
export async function loadCliff() {
  const cliffGroup = new THREE.Group();

  cliffGroup.name = "Main Cliff Environment";

  // Load the wall material.
  const cliffMaterial = await loadCliffMaterial();

  // Create the main wall.
  const wall = createCliffWall(cliffMaterial);

  cliffGroup.add(wall);

  // Load the optimized mountainside model.
  const detailGLTF = await loader.loadAsync(
    "/assets/models/mountainside_1k.gltf/mountainside_12pct.glb",
  );

  // Add formations across the entire cliff.
  addMountainsideDetails(
    cliffGroup,
    detailGLTF.scene,
    cliffMaterial,
    wall.position.z,
  );

  console.log("Complete cliff environment loaded.");

  return cliffGroup;
}
