import * as THREE from "three";

// Group containing our platforms.
// The visible platforms will now be boulder models.
const platforms = new THREE.Group();

// These objects describe where the player can land.
export const platformSurfaces = [];

// Platform positions and boulder settings.
export const platformDefinitions = [
  {
    x: -1,
    z: 0.8,
    width: 3.2,
    depth: 3.2,
    topY: 0.9,
    collisionWidth: 2.9,
    collisionDepth: 2.9,
    rockScale: 1.15,
    rockRotationY: 0.2,
  },
  {
    x: -0.5,
    z: -2.5,
    width: 3.2,
    depth: 3.2,
    topY: 1.8,
    collisionWidth: 2.9,
    collisionDepth: 2.9,
    rockScale: 1.3,
    rockRotationY: 0.45,
  },
  {
    x: 2.8,
    z: -4.3,
    width: 3.2,
    depth: 3.2,
    topY: 2.7,
    collisionWidth: 2.9,
    collisionDepth: 2.9,
    rockScale: 1.2,
    rockRotationY: 1.1,
    addSupportRocks: true,
  },
  {
    x: 4.5,
    z: -0.7,
    width: 3.2,
    depth: 3.2,
    topY: 3.6,
    collisionWidth: 2.9,
    collisionDepth: 2.9,
    rockScale: 1.25,
    rockRotationY: 2.0,
    addSupportRocks: true,
  },
  {
    x: 1.8,
    z: 2.3,
    width: 3.6,
    depth: 3.6,
    topY: 4.5,
    collisionWidth: 2.9,
    collisionDepth: 2.9,
    rockScale: 1.35,
    rockRotationY: 2.8,
    addSupportRocks: true,
  },
];

// Create the collision information for each platform.
platformDefinitions.forEach((data) => {
  platformSurfaces.push({
    x: data.x,
    z: data.z,
    width: data.collisionWidth,
    depth: data.collisionDepth,
    topY: data.topY,
  });
});

export default platforms;
