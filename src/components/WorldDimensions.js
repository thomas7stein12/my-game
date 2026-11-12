
// Increase the playable square footage by exactly 3x.
const AREA_SCALE = Math.sqrt(3);

// Original ground collision surface was 20 x 20.
export const PLAYABLE_AREA_SIZE = 20 * AREA_SCALE;

// Original player movement limit was +/- 9.4.
export const PLAYABLE_AREA_LIMIT = 9.4 * AREA_SCALE;

// Original visible boundary was +/- 9.8.
export const PLAYABLE_AREA_BOUNDARY = 9.8 * AREA_SCALE;
