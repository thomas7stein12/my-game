import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import * as THREE from "three";

export function PlayerControls(camera, domElement) {
  const controls = new PointerLockControls(camera, domElement);

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
  }

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

    domElement.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      if (lookPointerId !== null) return;

      event.preventDefault();

      lookPointerId = event.pointerId;
      lastLookX = event.clientX;
      lastLookY = event.clientY;

      domElement.setPointerCapture(event.pointerId);
    });

    domElement.addEventListener("pointermove", (event) => {
      if (event.pointerId !== lookPointerId) return;

      event.preventDefault();

      const deltaX = event.clientX - lastLookX;
      const deltaY = event.clientY - lastLookY;

      lastLookX = event.clientX;
      lastLookY = event.clientY;

      // Rotate the camera (inverted touch controls)
      camera.rotation.y += deltaX * lookSensitivity;
      camera.rotation.x += deltaY * lookSensitivity;

      // Prevent the camera from flipping upside down
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x,
        Math.PI / 2 - controls.maxPolarAngle,
        Math.PI / 2 - controls.minPolarAngle,
      );
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
  });

  // Movement settings
  const movementSpeed = 6;
  const platformLimit = 9.4;

  // Gravity settings
  const gravity = 20;
  const jumpStrength = 8;
  const eyeHeight = 1.7;

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
      verticalVelocity -= gravity * delta;
      camera.position.y += verticalVelocity * delta;

      // Land on the platform
      if (camera.position.y <= eyeHeight) {
        camera.position.y = eyeHeight;
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

    // Move relative to camera direction
    controls.moveForward(forward * movementSpeed * delta);
    controls.moveRight(right * movementSpeed * delta);

    // Keep player on the platform
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
  }

  return {
    controls,
    update,
  };
}
