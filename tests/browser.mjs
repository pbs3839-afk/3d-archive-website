/**
 * One way to launch the test browser.
 *
 * Headless Chromium renders WebGL on SwiftShader (the CPU) by default. With
 * scanned textures, the wear shader and SSAO that runs at about one frame per
 * second at 1440×900 — slow enough that Playwright's "wait until stable"
 * before a click times out. These flags hand WebGL to the real GPU through
 * ANGLE/Direct3D 11; on a machine without one, Chromium falls back to
 * SwiftShader by itself.
 *
 * Set TEST_GPU=0 to force the software renderer (for example to compare
 * against shots captured with it).
 */
import { chromium } from '@playwright/test';

export const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

export function launchBrowser() {
  return chromium.launch({ args: process.env.TEST_GPU === '0' ? [] : GPU_ARGS });
}
