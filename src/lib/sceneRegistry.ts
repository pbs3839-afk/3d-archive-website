import type { SpotLight } from 'three';

/**
 * Handles the scroll intro needs to bring the room up out of the dark.
 *
 * Same pattern as the locker and vault registries: the components own the
 * objects, the timelines look them up. Routing light intensity through React
 * state would re-render the scene on every scroll frame.
 */
export interface SceneHandles {
  keyLight: SpotLight | null;
  fillLight: SpotLight | null;
}

const handles: SceneHandles = { keyLight: null, fillLight: null };

export function registerSceneHandle<K extends keyof SceneHandles>(
  key: K,
  value: SceneHandles[K],
): void {
  handles[key] = value;
}

export function getSceneHandles(): SceneHandles {
  return handles;
}

/** Full-brightness targets, so the intro knows what to animate up to. */
export const LIGHT_TARGETS = {
  key: 152,
  fill: 48,
  /** scene.environmentIntensity once the room is fully lit. */
  environment: 0.3,
} as const;

/**
 * How far the intro has brought the room up out of the dark, 0–1.
 *
 * The environment map lights surfaces as well as reflecting in them, so it has
 * to rise with the spots or the "lost in the dark" opening is lit from nowhere.
 * Stored here rather than written straight to the scene because drei's
 * <Environment> resets scene.environmentIntensity whenever it re-renders;
 * `Lighting` re-applies this level every frame instead.
 */
let ambientLevel = 0;

export function setAmbientLevel(level: number): void {
  ambientLevel = level;
}

export function getAmbientLevel(): number {
  return ambientLevel;
}
