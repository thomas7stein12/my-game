import * as THREE from "three";

// Create a fog layer that hides the sky when looking toward the horizon.
export function createForestSkyFog(fogColor) {
  // Make a large sphere around the camera.
  const geometry = new THREE.SphereGeometry(70, 48, 32);

  // Use the same color as the forest fog.
  const material = new THREE.MeshBasicMaterial({
    color: fogColor,
    side: THREE.BackSide,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    fog: false,
  });

  // Customize the material so the fog fades away when looking upward.
  material.onBeforeCompile = (shader) => {
    // Pass the direction of each sphere fragment to the fragment shader.
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vSkyDirection;`,
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vSkyDirection = normalize(mat3(modelMatrix) * transformed);`,
    );

    // Receive the direction in the fragment shader.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vSkyDirection;`,
    );

    // Make the fog transparent as the viewing direction points upward.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>

      float skyElevation = normalize(vSkyDirection).y;

      // The sky begins appearing above the horizon.
      float skyVisibility = smoothstep(0.65, 0.95, skyElevation);

      // Show fog below the transition and sky above it.
      diffuseColor.a *= 1.0 - skyVisibility;`,
    );
  };

  const fogOverlay = new THREE.Mesh(geometry, material);

  // Keep the sphere around the player.
  fogOverlay.frustumCulled = false;

  return fogOverlay;
}
