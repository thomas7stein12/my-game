import * as THREE from "three";

import {
  CLIFF_BASE_Z,
  CLIFF_WALL_WIDTH,
  CLIFF_WALL_HEIGHT,
} from "./WorldDimensions.js";

const textureLoader = new THREE.TextureLoader();

// How far behind the playable boundary the cliff sits.
const CLIFF_WALL_OFFSET = 2.3;

// Load the marble cliff textures.
async function loadCliffMaterial() {
  const folder = "/assets/textures/cliff/textures/";

  const [diffuseMap, normalMap, roughnessMap] = await Promise.all([
    textureLoader.loadAsync(`${folder}marble_cliff_03_diff_1k.jpg`),

    textureLoader.loadAsync(`${folder}marble_cliff_03_nor_gl_1k.jpg`),

    textureLoader.loadAsync(`${folder}marble_cliff_03_arm_1k.jpg`),
  ]);

  // Set the correct color spaces.
  diffuseMap.colorSpace = THREE.SRGBColorSpace;

  normalMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.colorSpace = THREE.NoColorSpace;

  // Repeat the textures instead of stretching them.
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

    // Let the normal map provide additional surface detail.
    normalScale: new THREE.Vector2(1.0, 1.0),

    side: THREE.FrontSide,
  });
}

// Create the continuous textured cliff.
function createCliffWall(material) {
  const geometry = new THREE.PlaneGeometry(CLIFF_WALL_WIDTH, CLIFF_WALL_HEIGHT);

  const wall = new THREE.Mesh(geometry, material);

  wall.name = "Textured Marble Cliff Wall";

  // Position the wall behind the playable boundary.
  wall.position.set(0, CLIFF_WALL_HEIGHT / 2, CLIFF_BASE_Z - CLIFF_WALL_OFFSET);

  wall.castShadow = false;
  wall.receiveShadow = true;

  return wall;
}

// Load the complete cliff environment.
export async function loadCliff() {
  const cliffGroup = new THREE.Group();

  cliffGroup.name = "Main Cliff Environment";

  // Load the three textures.
  const cliffMaterial = await loadCliffMaterial();

  // Create the lightweight wall.
  const wall = createCliffWall(cliffMaterial);

  cliffGroup.add(wall);

  console.log("Textured cliff loaded:", {
    width: CLIFF_WALL_WIDTH,
    height: CLIFF_WALL_HEIGHT,
    triangles: 2,
  });

  return cliffGroup;
}
