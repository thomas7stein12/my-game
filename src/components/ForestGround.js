import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";

// Load regular image textures.
const textureLoader = new THREE.TextureLoader();

// Load HDR textures.
const exrLoader = new EXRLoader();

// Create our forest ground.
export async function loadForestGround() {
  // Load all three textures at the same time.
  const [diffuseMap, normalMap, roughnessMap] = await Promise.all([
    textureLoader.loadAsync(
      "/assets/textures/forest-ground/textures/forrest_ground_01_diff_2k.jpg",
    ),

    exrLoader.loadAsync(
      "/assets/textures/forest-ground/textures/forrest_ground_01_nor_gl_2k.exr",
    ),

    textureLoader.loadAsync(
      "/assets/textures/forest-ground/textures/forrest_ground_01_rough_2k.jpg",
    ),
  ]);

  // Tell Three.js how to interpret each texture.
  // Diffuse contains actual colors.
  diffuseMap.colorSpace = THREE.SRGBColorSpace;

  // Normal and roughness maps contain surface data, not colors.
  normalMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.colorSpace = THREE.NoColorSpace;

  // Repeat the textures across our 20 x 20 ground.
  const textures = [diffuseMap, normalMap, roughnessMap];

  textures.forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    texture.repeat.set(10, 10);
  });

  // Create the forest ground material.
  const material = new THREE.MeshStandardMaterial({
    map: diffuseMap,

    normalMap: normalMap,

    roughnessMap: roughnessMap,

    roughness: 1,

    // Adjust the strength of the surface details.
    normalScale: new THREE.Vector2(0.65, 0.65),
  });

  // Create the same size ground we already had.
  const geometry = new THREE.PlaneGeometry(20, 20);

  const ground = new THREE.Mesh(geometry, material);

  // Rotate it horizontally.
  ground.rotation.x = -Math.PI / 2;

  // Keep it at the original ground height.
  ground.position.y = 0;

  // Prepare the ground to receive shadows.
  ground.receiveShadow = true;

  ground.name = "Forest Ground";

  return ground;
}
