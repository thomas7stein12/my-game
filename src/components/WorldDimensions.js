import * as THREE from "three";

// --------------------------------------------------
// PLAYABLE TRIANGLE
// --------------------------------------------------

// The long side of the triangle is the cliff.
export const CLIFF_BASE_WIDTH = 60;
export const PLAYABLE_AREA_DEPTH = 26.7;

export const CLIFF_BASE_Z = -PLAYABLE_AREA_DEPTH / 2;
export const FOREST_APEX_Z = PLAYABLE_AREA_DEPTH / 2;

// The cliff extends beyond the playable triangle so
// its endpoints disappear into the fog.
export const CLIFF_WALL_WIDTH = 200;
export const CLIFF_WALL_HEIGHT = 12.5;

// Keep the original forest ground dimensions.
export const GROUND_HALF_SIZE = 50;

// The three triangle vertices.
export const PLAYABLE_AREA_VERTICES = [
  { x: -CLIFF_BASE_WIDTH / 2, z: CLIFF_BASE_Z },
  { x: CLIFF_BASE_WIDTH / 2, z: CLIFF_BASE_Z },
  { x: 0, z: FOREST_APEX_Z },
];

// The two shorter sides are the forest boundaries.
// Both are ordered so the outside is on their left.
export const FOREST_EDGE_SEGMENTS = [
  [PLAYABLE_AREA_VERTICES[0], PLAYABLE_AREA_VERTICES[2]],
  [PLAYABLE_AREA_VERTICES[2], PLAYABLE_AREA_VERTICES[1]],
];

// --------------------------------------------------
// TRIANGLE COLLISION
// --------------------------------------------------

// Check whether a point is inside the playable triangle.
//
// Margin keeps the player's collision radius away
// from the actual boundary.
export function isInsidePlayableArea(x, z, margin = 0) {
  const vertices = PLAYABLE_AREA_VERTICES;

  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];

    const edgeX = b.x - a.x;
    const edgeZ = b.z - a.z;

    const relativeX = x - a.x;
    const relativeZ = z - a.z;

    const cross = edgeX * relativeZ - edgeZ * relativeX;
    const edgeLength = Math.hypot(edgeX, edgeZ);

    const signedDistance = cross / edgeLength;

    if (signedDistance < margin) {
      return false;
    }
  }

  return true;
}

// Calculate the shortest distance from a point
// to a finite line segment in the XZ plane.
export function distanceToSegmentXZ(x, z, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;

  const lengthSquared = dx * dx + dz * dz;

  const t = THREE.MathUtils.clamp(
    ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared,
    0,
    1,
  );

  const closestX = start.x + t * dx;
  const closestZ = start.z + t * dz;

  return Math.hypot(x - closestX, z - closestZ);
}

// Compatibility constants for existing components.
export const PLAYABLE_AREA_SIZE = CLIFF_BASE_WIDTH;
export const PLAYABLE_AREA_LIMIT = CLIFF_BASE_WIDTH / 2;
export const PLAYABLE_AREA_BOUNDARY = CLIFF_BASE_WIDTH / 2;
