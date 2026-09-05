import { describe, expect, it } from 'vitest';
import { resolveCamera, resolveCameras, type CameraMeta, type PinData } from './cameraData';

const mockMeta: CameraMeta = {
  jurisdictions: ['Charleston', 'Greenville'],
  routes: ['I-26', 'US-17'],
  cameras: {
    'sc-abc': ['I-26 @ Exit 5', 0, 0, 'https://example.com/img.jpg', 'https://example.com/stream.m3u8', 1],
    'sc-def': ['US-17 @ Main St', 1, 1, 'https://example.com/img2.jpg', '', 0],
  },
};

describe('resolveCamera', () => {
  it('returns full camera when metadata is available', () => {
    const pin: PinData = [32.8, -80.0, 'sc-abc'];
    const cam = resolveCamera(pin, mockMeta);

    expect(cam.id).toBe('sc-abc');
    expect(cam.lat).toBe(32.8);
    expect(cam.lng).toBe(-80.0);
    expect(cam.name).toBe('I-26 @ Exit 5');
    expect(cam.description).toBe('I-26 @ Exit 5 (Charleston)');
    expect(cam.route).toBe('I-26');
    expect(cam.jurisdiction).toBe('Charleston');
    expect(cam.image_url).toBe('https://example.com/img.jpg');
    expect(cam.video_url).toBe('https://example.com/stream.m3u8');
    expect(cam.hasVideo).toBe(true);
  });

  it('returns stub when metadata is undefined', () => {
    const pin: PinData = [33.0, -81.0, 'sc-xyz'];
    const cam = resolveCamera(pin, undefined);

    expect(cam.id).toBe('sc-xyz');
    expect(cam.lat).toBe(33.0);
    expect(cam.lng).toBe(-81.0);
    expect(cam.name).toBe('sc-xyz');
    expect(cam.image_url).toBe('');
    expect(cam.video_url).toBe('');
    expect(cam.hasVideo).toBe(false);
  });

  it('returns stub when camera ID not in metadata', () => {
    const pin: PinData = [34.0, -82.0, 'ga-999'];
    const cam = resolveCamera(pin, mockMeta);

    expect(cam.id).toBe('ga-999');
    expect(cam.name).toBe('ga-999');
    expect(cam.image_url).toBe('');
  });
});

describe('resolveCameras', () => {
  it('resolves multiple pins', () => {
    const pins: PinData[] = [
      [32.8, -80.0, 'sc-abc'],
      [33.5, -79.0, 'sc-def'],
    ];
    const cams = resolveCameras(pins, mockMeta);

    expect(cams).toHaveLength(2);
    expect(cams[0].name).toBe('I-26 @ Exit 5');
    expect(cams[1].name).toBe('US-17 @ Main St');
    expect(cams[1].hasVideo).toBe(false);
  });

  it('returns stubs when metadata not loaded', () => {
    const pins: PinData[] = [[32.8, -80.0, 'sc-abc']];
    const cams = resolveCameras(pins, undefined);

    expect(cams[0].name).toBe('sc-abc');
    expect(cams[0].image_url).toBe('');
  });
});
