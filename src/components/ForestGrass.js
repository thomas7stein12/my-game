import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

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

// Calculate the horizontal footprint of an individual grass clump.
function getGrassFootprint(geometry) {
  const bounds = geometry.boundingBox;

  const maxX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));

  const maxZ = Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z));

  // Account for rotation when checking the boundary.
  return Math.hypot(maxX, maxZ);
}

// Load and distribute grass throughout the playable world.
export async function loadForestGrass() {
  const gltf = await loader.loadAsync(
    "/assets/models/grass_medium_01_1k.gltf/grass_medium_01_40pct_kn.glb",
  );

  const grassModel = gltf.scene;

  grassModel.updateMatrixWorld(true);

  const inverseRoot = grassModel.matrixWorld.clone().invert();

  // Collect the individual grass variations.
  const grassVariants = [];

  let sourceMaterial = null;

  grassModel.traverse((child) => {
    if (!child.isMesh) return;

    const childMaterial = Array.isArray(child.material)
      ? child.material[0]
      : child.material;

    if (!sourceMaterial) {
      sourceMaterial = childMaterial;
    }

    // Preserve the mesh's rotation and scale, but remove
    // its original position in the 17-mesh grass arrangement.
    const localMatrix = new THREE.Matrix4().multiplyMatrices(
      inverseRoot,
      child.matrixWorld,
    );

    localMatrix.setPosition(0, 0, 0);

    const geometry = child.geometry.clone().applyMatrix4(localMatrix);

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const bounds = geometry.boundingBox;

    grassVariants.push({
      name: child.name,
      geometry,
      minY: bounds.min.y,
      footprintRadius: getGrassFootprint(geometry),
    });
  });

  if (!sourceMaterial?.map || grassVariants.length === 0) {
    throw new Error("Could not load the grass model correctly.");
  }

  // Keep the original color texture.
  const grassMap = sourceMaterial.map;

  grassMap.colorSpace = THREE.SRGBColorSpace;

  // Release the unused normal and roughness textures.
  // Grass is small enough that these maps are unnecessary.
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

  sourceMaterial.dispose();

  // We have already copied the geometry we need.
  grassModel.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
    }
  });

  // Create one shared material for all grass variations.
  const grassMaterial = new THREE.MeshStandardMaterial({
    map: grassMap,
    color: 0xffffff,
    roughness: 1,
    metalness: 0,

    // Grass blades should be visible from both directions.
    side: THREE.DoubleSide,

    // Avoid expensive transparent-object sorting.
    transparent: false,
    depthWrite: true,
  });

  const grassGroup = new THREE.Group();
  grassGroup.name = "Forest Grass";

  // Boundary settings from BoundaryBarriers.js.
  const boundary = 9.8;
  const edgeClearance = 0.45;

  // Distribution settings.
  const cellSpacing = 0.48;
  const spawnChance = 0.88;

  const random = createRandom();

  // Store individual grass placements by model variation.
  const placements = grassVariants.map(() => []);

  const start = -boundary + edgeClearance;
  const end = boundary - edgeClearance;

  // Create an evenly distributed grid with randomized positions.
  for (let z = start; z <= end; z += cellSpacing) {
    for (let x = start; x <= end; x += cellSpacing) {
      // Leave occasional small gaps for a more natural appearance.
      if (random() > spawnChance) continue;

      // Select one of the 17 different grass variations.
      const variantIndex = Math.floor(random() * grassVariants.length);

      const variant = grassVariants[variantIndex];

      // Randomize grass size and rotation.
      const scale = 0.8 + random() * 0.45;
      const rotationY = random() * Math.PI * 2;

      // Calculate how close this particular grass model
      // can safely get to the boundary.
      const maximumCenter =
        boundary - edgeClearance - variant.footprintRadius * scale;

      // Slightly randomize the grid positions.
      const jitterX = (random() - 0.5) * cellSpacing * 0.75;
      const jitterZ = (random() - 0.5) * cellSpacing * 0.75;

      const grassX = THREE.MathUtils.clamp(
        x + jitterX,
        -maximumCenter,
        maximumCenter,
      );

      const grassZ = THREE.MathUtils.clamp(
        z + jitterZ,
        -maximumCenter,
        maximumCenter,
      );

      placements[variantIndex].push({
        x: grassX,
        z: grassZ,
        y: -variant.minY * scale,
        scale,
        rotationY,
      });
    }
  }

  // Reusable transformation objects.
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scaleVector = new THREE.Vector3();
  const matrix = new THREE.Matrix4();

  let totalGrass = 0;

  // Create one InstancedMesh per grass variation.
  // This keeps the draw-call count very low.
  grassVariants.forEach((variant, variantIndex) => {
    const grassPlacements = placements[variantIndex];

    if (grassPlacements.length === 0) return;

    const instancedMesh = new THREE.InstancedMesh(
      variant.geometry,
      grassMaterial,
      grassPlacements.length,
    );

    instancedMesh.name = `${variant.name} Instances`;

    // Grass does not need shadows.
    instancedMesh.castShadow = false;
    instancedMesh.receiveShadow = false;

    // These positions never change after creation.
    instancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    grassPlacements.forEach((grass, index) => {
      position.set(grass.x, grass.y, grass.z);

      quaternion.setFromAxisAngle(up, grass.rotationY);

      scaleVector.setScalar(grass.scale);

      matrix.compose(position, quaternion, scaleVector);

      instancedMesh.setMatrixAt(index, matrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;

    // Calculate bounds for frustum culling.
    instancedMesh.computeBoundingBox();
    instancedMesh.computeBoundingSphere();

    grassGroup.add(instancedMesh);

    totalGrass += grassPlacements.length;
  });

  console.log(
    `Forest grass created: ${totalGrass} individual clumps across ${grassVariants.length} variations.`,
  );

  return grassGroup;
}
