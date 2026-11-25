import * as THREE from "three";

import {
  loadRockModel,
  addRock,
  addRockSupport,
  createRockCollider,
} from "./Rock.js";

import { CLIFF_BASE_Z, CLIFF_WALL_OFFSET } from "./WorldDimensions.js";

// Create a natural cave entrance from existing boulders.
export async function loadCaveEntrance() {
  const model = await loadRockModel();

  const caveGroup = new THREE.Group();

  caveGroup.name = "Natural Cave Entrance";

  const colliders = [];

  // Position the rocks directly against the cliff.
  const wallZ = CLIFF_BASE_Z - CLIFF_WALL_OFFSET;

  // Keep most of the boulders behind the playable boundary.
  const rockZ = wallZ - 0.45;

  // Helper for adding rocks and their collision boundaries.
  function addCaveRock(options) {
    const rock = addRock(caveGroup, model, options);

    colliders.push(createRockCollider(rock));

    return rock;
  }

  // --------------------------------------------------
  // LEFT AND RIGHT ROCK PILLARS
  // --------------------------------------------------

  function addCavePillar(x, rotationY) {
    // Build up the pillar using overlapping support rocks.
    const supportRocks = addRockSupport(caveGroup, model, {
      position: {
        x,
        z: rockZ,
      },

      topY: 5.2,
      scale: 1.65,
      rotationY,
    });

    // Add collision boundaries to each support.
    supportRocks.forEach((rock) => {
      colliders.push(createRockCollider(rock));
    });

    // Main boulder at the top of the pillar.
    addCaveRock({
      position: {
        x,
        y: 0,
        z: rockZ,
      },

      topY: 5.2,
      scale: 1.65,
      rotationY,
    });
  }

  // Large formations on either side of the entrance.
  addCavePillar(-3.8, 0.18);
  addCavePillar(3.25, -0.22);

  // --------------------------------------------------
  // UPPER CAVE ARCH
  // --------------------------------------------------

  // These boulders overlap the tops of the pillars,
  // forming a heavy, irregular rock arch.
  addCaveRock({
    position: {
      x: -2.15,
      y: 4.1,
      z: rockZ + 0.2,
    },

    scale: 1.35,
    rotationY: Math.PI / 2 - 0.08,
  });

  addCaveRock({
    position: {
      x: 0,
      y: 4.6,
      z: rockZ + 0.4,
    },

    scale: 1.4,
    rotationY: Math.PI / 2 + 0.05,
  });

  addCaveRock({
    position: {
      x: 2.15,
      y: 4.1,
      z: rockZ + 0.2,
    },

    scale: 1.35,
    rotationY: Math.PI / 2 + 0.08,
  });

  // --------------------------------------------------
  // LOWER ROCK SHOULDERS
  // --------------------------------------------------

  // Additional rocks help the pillars blend into the ground.
  addCaveRock({
    position: {
      x: -5.35,
      y: 0,
      z: rockZ + 0.2,
    },

    scale: 1.0,
    rotationY: 0.65,
  });

  addCaveRock({
    position: {
      x: 5.35,
      y: 0,
      z: rockZ + 0.2,
    },

    scale: 1.0,
    rotationY: -0.55,
  });

  console.log("Cave entrance constructed:", {
    rockCount: colliders.length,
    cavePosition: rockZ,
  });

  return {
    group: caveGroup,
    colliders,
  };
}
