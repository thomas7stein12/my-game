import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import * as THREE from "three";

export function PlayerControls(
  camera,
  domElement,
  platformSurfaces = [],
  rockColliders = [],
) {
  const controls = new PointerLockControls(camera, domElement);

  // Background music
  const backgroundMusic = new Audio("/audio/forest-ambience.m4a");

  // Keep the music looping.
  backgroundMusic.loop = true;

  // Set background music volume.
  backgroundMusic.volume = 0.25;

  // Start playing the music.
  function startBackgroundMusic() {
    backgroundMusic.play().catch((error) => {
      console.warn("Background music could not start:", error);
    });
  }

  // Pause the music when the player leaves.
  function stopBackgroundMusic() {
    backgroundMusic.pause();
  }

  // Mouse sensitivity
  controls.pointerSpeed = 1;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI - 0.15;

  // Detect touch devices
  const isTouchDevice =
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;

  if (isTouchDevice) {
    document.body.classList.add("mobile-game");

    // Start music when the player first interacts.
    document.addEventListener("pointerdown", startBackgroundMusic);
  }

  // Pause music when the player leaves the browser tab.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopBackgroundMusic();
    }
  });

  // Track keyboard input
  const keys = new Set();

  const movementKeys = [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
  ];

  // Movement input
  let joystickForward = 0;
  let joystickRight = 0;
  let jumpRequested = false;

  // Mobile controls
  let joystick = null;
  let joystickKnob = null;

  function resetJoystick() {
    joystickForward = 0;
    joystickRight = 0;

    if (joystickKnob) {
      joystickKnob.style.setProperty("--knob-x", "0px");
      joystickKnob.style.setProperty("--knob-y", "0px");
    }
  }

  if (isTouchDevice) {
    // Create mobile control interface
    const mobileControls = document.createElement("div");
    mobileControls.className = "mobile-controls";

    // Create joystick
    joystick = document.createElement("div");
    joystick.className = "mobile-joystick";
    joystick.setAttribute("aria-label", "Movement joystick");

    joystickKnob = document.createElement("div");
    joystickKnob.className = "mobile-joystick-knob";

    joystick.appendChild(joystickKnob);

    // Create jump button
    const jumpButton = document.createElement("button");
    jumpButton.className = "mobile-jump";
    jumpButton.type = "button";
    jumpButton.textContent = "JUMP";

    mobileControls.appendChild(joystick);
    mobileControls.appendChild(jumpButton);

    document.body.appendChild(mobileControls);

    // Joystick input
    let joystickPointerId = null;

    function updateJoystick(event) {
      const rect = joystick.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = event.clientX - centerX;
      let dy = event.clientY - centerY;

      const maxDistance = (rect.width - joystickKnob.offsetWidth) / 2;

      const distance = Math.hypot(dx, dy);

      // Limit joystick movement
      if (distance > maxDistance) {
        dx = (dx / distance) * maxDistance;
        dy = (dy / distance) * maxDistance;
      }

      // Calculate joystick direction
      joystickRight = dx / maxDistance;
      joystickForward = -dy / maxDistance;

      // Apply a small dead zone
      if (Math.hypot(joystickRight, joystickForward) < 0.08) {
        joystickRight = 0;
        joystickForward = 0;
      }

      // Move the joystick knob visually
      joystickKnob.style.setProperty("--knob-x", `${dx}px`);
      joystickKnob.style.setProperty("--knob-y", `${dy}px`);
    }

    function endJoystick() {
      joystickPointerId = null;
      resetJoystick();
    }

    joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      joystickPointerId = event.pointerId;
      joystick.setPointerCapture(event.pointerId);

      updateJoystick(event);
    });

    joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== joystickPointerId) return;

      event.preventDefault();
      updateJoystick(event);
    });

    joystick.addEventListener("pointerup", endJoystick);
    joystick.addEventListener("pointercancel", endJoystick);

    // Jump button
    jumpButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      jumpRequested = true;
    });

    // Touch to look around
    let lookPointerId = null;
    let lastLookX = 0;
    let lastLookY = 0;

    const lookSensitivity = 0.004;

    // Use the same rotation order as PointerLockControls
    const lookRotation = new THREE.Euler(0, 0, 0, "YXZ");

    domElement.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      if (lookPointerId !== null) return;

      event.preventDefault();

      lookPointerId = event.pointerId;
      lastLookX = event.clientX;
      lastLookY = event.clientY;

      // Sync with the current camera orientation
      lookRotation.setFromQuaternion(camera.quaternion);

      domElement.setPointerCapture(event.pointerId);
    });

    domElement.addEventListener("pointermove", (event) => {
      if (event.pointerId !== lookPointerId) return;

      event.preventDefault();

      const deltaX = event.clientX - lastLookX;
      const deltaY = event.clientY - lastLookY;

      lastLookX = event.clientX;
      lastLookY = event.clientY;

      // Rotate the camera using YXZ order
      lookRotation.y += deltaX * lookSensitivity;
      lookRotation.x += deltaY * lookSensitivity;

      // Prevent the camera from flipping or rolling
      lookRotation.x = THREE.MathUtils.clamp(
        lookRotation.x,
        Math.PI / 2 - controls.maxPolarAngle,
        Math.PI / 2 - controls.minPolarAngle,
      );

      // Apply the rotation
      camera.quaternion.setFromEuler(lookRotation);
    });

    function endLook(event) {
      if (event.pointerId === lookPointerId) {
        lookPointerId = null;
      }
    }

    domElement.addEventListener("pointerup", endLook);
    domElement.addEventListener("pointercancel", endLook);
  } else {
    // Desktop: click to lock the mouse
    domElement.addEventListener("click", () => {
      if (!controls.isLocked) {
        startBackgroundMusic();
        controls.lock();
      }
    });
  }

  // Keyboard input (desktop and external mobile keyboards)
  window.addEventListener("keydown", (event) => {
    if (movementKeys.includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }

    if (event.code === "Space" && (isTouchDevice || controls.isLocked)) {
      event.preventDefault();
      jumpRequested = true;
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  // Clear input when window loses focus
  window.addEventListener("blur", () => {
    keys.clear();
    jumpRequested = false;
    resetJoystick();
  });

  controls.addEventListener("unlock", () => {
    keys.clear();
    stopBackgroundMusic();
  });

  // Movement settings
  const movementSpeed = 6;
  const platformLimit = 9.4;

  // Approximate radius of the player's collision body.
  const playerRadius = 0.1;

  // Gravity settings
  const gravity = 20;
  const jumpStrength = 8;
  const eyeHeight = 1.7;

  // All surfaces the player is allowed to land on.
  const collisionSurfaces = [
    // Original ground platform
    {
      x: 0,
      z: 0,
      width: 20,
      depth: 20,
      topY: 0,
    },

    // Our new elevated platforms
    ...platformSurfaces,
  ];

  // Check whether the player's position is above a platform.
  function isPlayerOverSurface(surface) {
    const withinX =
      camera.position.x >= surface.x - surface.width / 2 &&
      camera.position.x <= surface.x + surface.width / 2;

    const withinZ =
      camera.position.z >= surface.z - surface.depth / 2 &&
      camera.position.z <= surface.z + surface.depth / 2;

    return withinX && withinZ;
  }

  // Check whether the player's body is overlapping a rock.
  function isOverlappingRock(x, z, collider) {
    const playerFeetY = camera.position.y - eyeHeight;
    const playerHeadY = camera.position.y;

    // Only collide with the sides of rocks when the player's
    // body actually overlaps the rock vertically.
    const overlapsVertically =
      playerHeadY > collider.minY && playerFeetY < collider.maxY - 0.08;

    if (!overlapsVertically) {
      return false;
    }

    // Expand the rock's collision boundary to account for
    // the player's own collision radius.
    const radiusX = collider.radiusX + playerRadius;
    const radiusZ = collider.radiusZ + playerRadius;

    // Calculate the player's distance from the rock.
    const dx = (x - collider.x) / radiusX;
    const dz = (z - collider.z) / radiusZ;

    // Check whether the player is inside the boundary.
    return dx * dx + dz * dz < 1;
  }

  // Prevent the player from walking through rocks.
  function resolveRockCollisions(previousX, previousZ) {
    for (const collider of rockColliders) {
      // Skip this rock if there is no collision.
      if (!isOverlappingRock(camera.position.x, camera.position.z, collider)) {
        continue;
      }

      // Remember the position we were trying to reach.
      const nextX = camera.position.x;
      const nextZ = camera.position.z;

      // Try blocking movement along the Z axis first.
      // This allows the player to slide along the rock.
      if (!isOverlappingRock(nextX, previousZ, collider)) {
        camera.position.z = previousZ;
      }

      // Otherwise, try blocking movement along the X axis.
      else if (!isOverlappingRock(previousX, nextZ, collider)) {
        camera.position.x = previousX;
      }

      // If neither direction is safe, push the player
      // outside the rock's collision boundary.
      else {
        let dx = nextX - collider.x;
        let dz = nextZ - collider.z;

        const radiusX = collider.radiusX + playerRadius;
        const radiusZ = collider.radiusZ + playerRadius;

        let distance = Math.sqrt((dx / radiusX) ** 2 + (dz / radiusZ) ** 2);

        // Handle the rare case where the player is at the
        // exact center of the rock.
        if (distance < 0.0001) {
          dx = previousX - collider.x;
          dz = previousZ - collider.z;

          distance = Math.sqrt((dx / radiusX) ** 2 + (dz / radiusZ) ** 2);
        }

        // Choose a safe direction if the previous position
        // was also directly inside the rock.
        if (distance < 0.0001) {
          dx = 1;
          dz = 0;
          distance = 1 / radiusX;
        }

        // Move the player to the edge of the collision boundary.
        camera.position.x = collider.x + dx / distance;
        camera.position.z = collider.z + dz / distance;
      }
    }
  }

  let verticalVelocity = 0;
  let isGrounded = true;

  // Update player movement and physics
  function update(delta) {
    const canControl = isTouchDevice || controls.isLocked;

    // Handle jumping
    if (canControl && jumpRequested && isGrounded) {
      verticalVelocity = jumpStrength;
      isGrounded = false;
    }

    jumpRequested = false;

    // Apply gravity
    if (!isGrounded) {
      // Remember where the player's feet were before falling.
      const previousFeetY = camera.position.y - eyeHeight;

      verticalVelocity -= gravity * delta;
      camera.position.y += verticalVelocity * delta;

      // Only check for landing while moving downward.
      if (verticalVelocity <= 0) {
        const currentFeetY = camera.position.y - eyeHeight;

        let landingSurface = null;

        // Check every platform.
        for (const surface of collisionSurfaces) {
          // Did the player cross the top of this platform?
          const crossedSurface =
            previousFeetY >= surface.topY && currentFeetY <= surface.topY;

          // Is the player horizontally over the platform?
          const overSurface = isPlayerOverSurface(surface);

          if (
            crossedSurface &&
            overSurface &&
            (!landingSurface || surface.topY > landingSurface.topY)
          ) {
            landingSurface = surface;
          }
        }

        // Land on the highest surface we crossed.
        if (landingSurface) {
          camera.position.y = landingSurface.topY + eyeHeight;

          verticalVelocity = 0;
          isGrounded = true;
        }
      }

      // Reset the player if they fall out of the world.
      if (camera.position.y < -10) {
        camera.position.set(0, eyeHeight, 5);

        verticalVelocity = 0;
        isGrounded = true;
      }
    }

    if (!canControl) return;

    let forward = 0;
    let right = 0;

    // Keyboard movement
    if (keys.has("KeyW") || keys.has("ArrowUp")) forward++;
    if (keys.has("KeyS") || keys.has("ArrowDown")) forward--;

    if (keys.has("KeyD") || keys.has("ArrowRight")) right++;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) right--;

    // Joystick movement
    forward += joystickForward;
    right += joystickRight;

    // Limit diagonal movement without removing analog speed
    const length = Math.hypot(forward, right);

    if (length > 1) {
      forward /= length;
      right /= length;
    }

    // Remember our position before moving.
    const previousX = camera.position.x;
    const previousZ = camera.position.z;

    // Move relative to camera direction.
    controls.moveForward(forward * movementSpeed * delta);
    controls.moveRight(right * movementSpeed * delta);

    // Keep player inside the playable area.
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -platformLimit,
      platformLimit,
    );

    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -platformLimit,
      platformLimit,
    );

    // Check and resolve collisions with all the rocks.
    resolveRockCollisions(previousX, previousZ);

    // Check whether the player still has a platform underneath them.
    if (isGrounded) {
      const playerFeetY = camera.position.y - eyeHeight;

      const hasSupport = collisionSurfaces.some((surface) => {
        const standingAtCorrectHeight =
          Math.abs(playerFeetY - surface.topY) < 0.05;

        return standingAtCorrectHeight && isPlayerOverSurface(surface);
      });

      // Start falling if the player walks off the platform.
      if (!hasSupport) {
        isGrounded = false;
      }
    }
  }

  return {
    controls,
    update,
  };
}
