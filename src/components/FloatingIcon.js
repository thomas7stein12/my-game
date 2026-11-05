import * as THREE from "three";

// Create the question mark image using a 2D canvas.
function createQuestionMarkTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");

  // Glowing background
  ctx.beginPath();
  ctx.arc(128, 128, 95, 0, Math.PI * 2);
  ctx.fillStyle = "#102c40";
  ctx.fill();

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#6ee7ff";
  ctx.stroke();

  // Question mark
  ctx.font = "bold 150px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.fillText("?", 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

export function createFloatingIcon(scene, options = {}) {
  const {
    position = { x: 7, y: 0, z: 5 },
    headingText = "You found the marker!",
    descriptionText = "This is your first interactive object. Walk away to hide this message.",
  } = options;
  // Main group positioned at the center of the platform.
  const marker = new THREE.Group();
  marker.position.set(position.x, position.y, position.z);
  scene.add(marker);

  // Ground ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.035, 10, 64),
    new THREE.MeshStandardMaterial({
      color: 0x65e6ff,
      emissive: 0x087c9c,
      emissiveIntensity: 1.5,
    }),
  );

  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  marker.add(ring);

  // Everything inside this group will float together.
  const floatingGroup = new THREE.Group();
  floatingGroup.position.y = 1.15;
  marker.add(floatingGroup);

  // Floating crystal
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28),
    new THREE.MeshStandardMaterial({
      color: 0x83f0ff,
      emissive: 0x0786a8,
      emissiveIntensity: 1.8,
      metalness: 0.25,
      roughness: 0.22,
    }),
  );

  floatingGroup.add(crystal);

  // Question mark badge
  const badge = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createQuestionMarkTexture(),
      transparent: true,
      depthWrite: false,
    }),
  );

  badge.position.y = 0.65;
  badge.scale.set(0.85, 0.85, 1);
  floatingGroup.add(badge);

  // Small light surrounding the icon
  const light = new THREE.PointLight(0x35dfff, 2, 5);
  light.position.y = 0.25;
  floatingGroup.add(light);

  // Create the message displayed to the player.
  const message = document.createElement("div");
  message.className = "interaction-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  message.setAttribute("aria-hidden", "true");

  const heading = document.createElement("strong");
  heading.textContent = headingText;

  const description = document.createElement("span");
  description.textContent = descriptionText;

  message.append(heading, description);
  document.body.appendChild(message);

  // Distance required to activate the message.
  const activationRadius = 1.8;

  let isMessageVisible = false;

  function update(camera, elapsedTime) {
    // Make the icon bounce smoothly.
    floatingGroup.position.y = 1.15 + Math.sin(elapsedTime * 2.2) * 0.13;

    // Slowly rotate the crystal.
    crystal.rotation.y = elapsedTime * 0.7;

    // Make the light gently pulse.
    light.intensity = 2 + Math.sin(elapsedTime * 2.2) * 0.35;

    // Calculate the distance between player and marker.
    // Calculate horizontal distance from the marker.
    const horizontalDistance = Math.hypot(
      camera.position.x - marker.position.x,
      camera.position.z - marker.position.z,
    );

    // The camera is 1.7 units above the player's feet.
    const playerFeetY = camera.position.y - 1.7;

    // Check the vertical distance too.
    const verticalDistance = Math.abs(playerFeetY - marker.position.y);

    // Both horizontal and vertical distance must be close enough.
    const shouldShowMessage =
      horizontalDistance <= activationRadius && verticalDistance <= 2;

    // Only update the message when its visibility changes.
    if (shouldShowMessage !== isMessageVisible) {
      isMessageVisible = shouldShowMessage;

      message.classList.toggle("visible", isMessageVisible);
      message.setAttribute("aria-hidden", String(!isMessageVisible));
    }
  }

  return { update };
}
