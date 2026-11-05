import * as THREE from "three";

// Group containing all of our elevated platforms.
const platforms = new THREE.Group();

// These objects describe the surfaces the player can land on.
export const platformSurfaces = [];

// Platform layout.
// topY represents the height of the TOP of each platform.
const platformDefinitions = [
  {
    x: 0,
    z: 2.1,
    width: 3.2,
    depth: 3.2,
    topY: 0.9,
    color: 0x4f9fc5,
  },
  {
    x: 0,
    z: -2,
    width: 3.2,
    depth: 3.2,
    topY: 1.8,
    color: 0x678bd4,

    // This platform will use a boulder instead of a box.
    useRock: true,

    // Smaller collision area so the player lands near the
    // center of the boulder's upper surface.
    collisionWidth: 1.8,
    collisionDepth: 1.8,
  },
  {
    x: 2.8,
    z: -4.3,
    width: 3.2,
    depth: 3.2,
    topY: 2.7,
    color: 0x8c70c9,
  },
  {
    x: 4.5,
    z: -0.7,
    width: 3.2,
    depth: 3.2,
    topY: 3.6,
    color: 0xc17ca9,
  },
  {
    x: 1.8,
    z: 2.3,
    width: 3.6,
    depth: 3.6,
    topY: 4.5,
    color: 0x54b89c,
  },
];

// Thickness of each rectangular platform.
const thickness = 0.4;

// Create every platform.
platformDefinitions.forEach((data) => {
  // Only create a rectangular mesh if this isn't a rock platform.
  if (!data.useRock) {
    const geometry = new THREE.BoxGeometry(data.width, thickness, data.depth);

    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.7,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(data.x, data.topY - thickness / 2, data.z);

    platforms.add(mesh);
  }

  // Save collision information for every platform,
  // including the one that will be visually represented by a rock.
  platformSurfaces.push({
    x: data.x,
    z: data.z,
    width: data.collisionWidth ?? data.width,
    depth: data.collisionDepth ?? data.depth,
    topY: data.topY,
  });
});

export default platforms;
