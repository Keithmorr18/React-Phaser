import type { SpriteScene } from './SpriteScene';

/** Live reference to the running Phaser scene, used by the React toolbar. */
export const sceneApi: { current: SpriteScene | null } = { current: null };
