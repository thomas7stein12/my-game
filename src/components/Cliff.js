import * as THREE from "three";

import {
  CLIFF_BASE_Z,
  CLIFF_WALL_WIDTH,
  CLIFF_WALL_HEIGHT,
  CLIFF_WALL_OFFSET,
} from "./WorldDimensions.js";

const textureLoader = new THREE.TextureLoader();

// Load the cliff textures.
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

  // Repeat textures using world-space UV coordinates.
  [diffuseMap, normalMap, roughnessMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  return new THREE.MeshStandardMaterial({
    map: diffuseMap,
    normalMap,
    roughnessMap,

    roughness: 1,
    metalness: 0,

    normalScale: new THREE.Vector2(1, 1),

    side: THREE.FrontSide,
  });
}

// Create a textured cliff wall with an actual opening.
function createCliffWall(material) {
  const shape = new THREE.Shape();

  // Main rectangular cliff outline.
  shape.moveTo(-CLIFF_WALL_WIDTH / 2, 0);
  shape.lineTo(CLIFF_WALL_WIDTH / 2, 0);
  shape.lineTo(CLIFF_WALL_WIDTH / 2, CLIFF_WALL_HEIGHT);
  shape.lineTo(-CLIFF_WALL_WIDTH / 2, CLIFF_WALL_HEIGHT);
  shape.closePath();

  // Create the opening near the center.
  const openingWidth = 4.5;
  const openingHeight = 4.8;
  const springHeight = 3.1;

  const caveHole = new THREE.Path();

  caveHole.moveTo(-openingWidth / 2, 0);
  caveHole.lineTo(-openingWidth / 2, springHeight);

  caveHole.quadraticCurveTo(-openingWidth / 2, openingHeight, 0, openingHeight);

  caveHole.quadraticCurveTo(
    openingWidth / 2,
    openingHeight,
    openingWidth / 2,
    springHeight,
  );

  caveHole.lineTo(openingWidth / 2, 0);
  caveHole.closePath();

  shape.holes.push(caveHole);

  // Generate geometry around the opening.
  const geometry = new THREE.ShapeGeometry(shape, 32);

  // Tile the textures every 7 world units.
  // ShapeGeometry uses position-based UVs, so create
  // the texture coordinates directly in world units.
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  const tileSize = 7;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);

    uvs.setXY(i, (x + CLIFF_WALL_WIDTH / 2) / tileSize, y / tileSize);
  }

  uvs.needsUpdate = true;

  const wall = new THREE.Mesh(geometry, material);

  wall.name = "Textured Cliff With Cave Opening";

  const wallZ = CLIFF_BASE_Z - CLIFF_WALL_OFFSET;

  wall.position.set(0, 0, wallZ);

  wall.castShadow = false;
  wall.receiveShadow = true;

  return wall;
}

// Create the dark interior visible through the cave entrance.

// Create a dark backdrop behind the entire cliff.
// The cliff hides it everywhere except through the cave opening.
function createCaveInterior(wallZ) {
  const geometry = new THREE.PlaneGeometry(
    CLIFF_WALL_WIDTH + 40,
    CLIFF_WALL_HEIGHT + 8,
  );

  const material = new THREE.MeshBasicMaterial({
    color: 0x07090b,
    side: THREE.DoubleSide,
  });

  const interior = new THREE.Mesh(geometry, material);

  interior.name = "Dark Cave Backdrop";

  // Keep the backdrop behind all the cave boulders.
  interior.position.set(0, CLIFF_WALL_HEIGHT / 2, wallZ - 8);

  return interior;
}

// Load the entire cliff environment.
export async function loadCliff() {
  const cliffGroup = new THREE.Group();

  cliffGroup.name = "Main Cliff Environment";

  const material = await loadCliffMaterial();

  const wall = createCliffWall(material);

  const wallZ = CLIFF_BASE_Z - CLIFF_WALL_OFFSET;

  // Add the dark interior first.
  cliffGroup.add(createCaveInterior(wallZ));

  // Add the cliff around the opening.
  cliffGroup.add(wall);

  console.log("Cliff and cave opening loaded.");

  return cliffGroup;
}
