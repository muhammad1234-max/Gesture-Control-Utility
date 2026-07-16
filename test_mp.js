import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
globalThis.HTMLVideoElement = dom.window.HTMLVideoElement;
globalThis.HTMLImageElement = dom.window.HTMLImageElement;

Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'Node' },
  writable: true,
  configurable: true
});

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

async function test() {
  try {
    console.log('Loading WASM...');
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    console.log('WASM loaded.');
    
    console.log('Creating Landmarker...');
    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "CPU"
      },
      runningMode: "VIDEO",
      numHands: 2,
    });
    console.log('Landmarker loaded successfully!', landmarker);
  } catch (e) {
    console.error('Failed:', e);
  }
}

test();
