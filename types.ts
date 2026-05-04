export enum CameraMode {
  TEXT_TO_IMAGE = 'TEXT_TO_IMAGE',
  IMAGE_TO_IMAGE = 'IMAGE_TO_IMAGE',
  EARTH_TO_IMAGE = 'EARTH_TO_IMAGE',
}

export interface CameraSettings {
  focalLength: number; // 24mm - 200mm (Manual override allowed)
  aperture: number; // f/1.0 - f/16 (Simulated style)
  iso: number; // Simulated brightness gain
  shutterSpeed: string; // Aesthetic only
  focusDistance: number; // 0 to 100
  aspectRatio: string; // "1:1", "3:4", "4:3", "9:16", "16:9", "21:9"
  resolution: string; // "1K", "2K", "4K"
  lensType: 'STANDARD' | 'MACRO' | 'PROBE' | 'STORYBOARD'; // New lens types
}

export interface CapturedImage {
  id: string;
  url: string;
  timestamp: number;
  settings: CameraSettings;
  prompt: string;
}