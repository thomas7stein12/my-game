import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";

// Load our HDR environment.
const exrLoader = new EXRLoader();

// Load our forest environment.
export async function loadForestEnvironment() {
  const environmentMap = await exrLoader.loadAsync(
    "/assets/environments/snowy_forest_2k.exr",
  );

  // Tell Three.js this is a 360-degree environment map.
  environmentMap.mapping = THREE.EquirectangularReflectionMapping;

  return environmentMap;
}
