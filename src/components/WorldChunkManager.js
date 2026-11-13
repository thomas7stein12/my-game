import * as THREE from "three";

export class WorldChunkManager {
  constructor({
    name = "World",
    camera,
    chunks,
    loadChunk,
    unloadChunk,
    loadDistance = 36,
    unloadDistance = 44,
    maxViewDistance = 52,
    updateInterval = 0.2,
    maxLoadsPerUpdate = 4,
  }) {
    this.camera = camera;
    this.chunks = chunks;

    this.loadChunk = loadChunk;
    this.unloadChunk = unloadChunk;

    this.loadDistance = loadDistance;
    this.unloadDistance = unloadDistance;
    this.maxViewDistance = maxViewDistance;

    this.updateInterval = updateInterval;
    this.maxLoadsPerUpdate = maxLoadsPerUpdate;
    this.name = name;

    // Reusable camera visibility calculations.
    this.frustum = new THREE.Frustum();
    this.projectionViewMatrix = new THREE.Matrix4();

    // Trigger the first update immediately.
    this.updateTimer = updateInterval;
  }

  // Calculate the shortest horizontal distance
  // between the player and a chunk.
  getDistanceToChunk(position, bounds) {
    const dx = Math.max(
      bounds.min.x - position.x,
      0,
      position.x - bounds.max.x,
    );

    const dz = Math.max(
      bounds.min.z - position.z,
      0,
      position.z - bounds.max.z,
    );

    return Math.hypot(dx, dz);
  }

  update(delta) {
    this.updateTimer += delta;

    // Avoid checking every chunk every frame.
    if (this.updateTimer < this.updateInterval) return;

    this.updateTimer = 0;

    // Update the camera's world transformation.
    this.camera.updateMatrixWorld(true);

    // Construct the camera's view-projection matrix.
    this.projectionViewMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );

    // Calculate the current camera frustum.
    this.frustum.setFromProjectionMatrix(this.projectionViewMatrix);

    const playerPosition = this.camera.position;

    const pendingLoads = [];

    let unloadedCount = 0;

    // Check all known world chunks.
    for (const [chunkKey, chunk] of this.chunks) {
      const distance = this.getDistanceToChunk(playerPosition, chunk.bounds);

      // Only prioritize chunks inside the visible distance.
      const inCameraView =
        distance <= this.maxViewDistance &&
        this.frustum.intersectsBox(chunk.bounds);

      // Keep nearby chunks loaded even behind the player.
      const shouldLoad = distance <= this.loadDistance || inCameraView;

      const isLoaded = chunk.group !== null;

      // Prepare new chunks for loading.
      if (shouldLoad && !isLoaded) {
        pendingLoads.push({
          chunkKey,
          distance,
        });
      }

      // Unload chunks that are far away and outside view.
      else if (!shouldLoad && isLoaded && distance > this.unloadDistance) {
        this.unloadChunk(chunkKey);
        unloadedCount++;
      }
    }

    // Load the nearest requested chunks first.
    pendingLoads.sort((a, b) => a.distance - b.distance);

    const chunksToLoad = pendingLoads.slice(0, this.maxLoadsPerUpdate);

    chunksToLoad.forEach(({ chunkKey }) => {
      this.loadChunk(chunkKey);
    });

    // Report changes only when something actually changes.
    if (chunksToLoad.length > 0 || unloadedCount > 0) {
      const activeChunks = [...this.chunks.values()].filter(
        (chunk) => chunk.group !== null,
      ).length;

      console.log(`${this.name} Chunk Manager:`, {
        loaded: chunksToLoad.length,
        unloaded: unloadedCount,
        activeChunks,
        totalChunks: this.chunks.size,
      });
    }
  }
}
