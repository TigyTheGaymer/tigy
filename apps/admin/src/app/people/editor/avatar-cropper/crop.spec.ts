import {
  clamp,
  initialCrop,
  MAX_ZOOM,
  output,
  pan,
  side,
  zoomAround,
} from './crop';

describe('crop', () => {
  it('starts on the largest centred square', () => {
    const crop = initialCrop(4000, 3000);
    expect(side(crop)).toBe(3000);
    expect(output(crop)).toEqual({
      sx: 500,
      sy: 0,
      sourceSide: 3000,
      size: 512,
    });
  });

  it('Small picture: keeps the largest square of a 300 by 200 picture at 200 pixels', () => {
    expect(output(initialCrop(300, 200)).size).toBe(200);
  });

  it('keeps the zoom between fitting the shorter side and 8 times that', () => {
    const crop = initialCrop(800, 600);
    expect(clamp({ ...crop, zoom: 0.5 }).zoom).toBe(1);
    expect(clamp({ ...crop, zoom: 20 }).zoom).toBe(MAX_ZOOM);
    expect(side(clamp({ ...crop, zoom: 20 }))).toBe(75);
  });

  it('pans the picture with the pointer, kept inside the picture', () => {
    const crop = initialCrop(800, 600);
    // Dragging right shows more of the left side.
    expect(pan(crop, 30, 0, 300).cx).toBe(340);
    expect(pan(crop, 10_000, 10_000, 300)).toEqual(
      expect.objectContaining({ cx: 300, cy: 300 }),
    );
    expect(pan(crop, -10_000, 0, 300).cx).toBe(500);
  });

  it('zooms around a point, keeping the picture under it in place', () => {
    const crop = initialCrop(800, 800);
    // The top-left quarter's centre, under the frame point (75, 75).
    const zoomed = zoomAround(crop, 2, 75, 75, 300);
    expect(side(zoomed)).toBe(400);
    expect(zoomed.cx - side(zoomed) / 2 + (75 / 300) * side(zoomed)).toBe(200);
    expect(zoomed.cy).toBe(300);
  });

  it('pinches around the midpoint without leaving the picture', () => {
    const crop = zoomAround(initialCrop(800, 600), 4, 0, 0, 300);
    expect(crop.zoom).toBe(4);
    expect(crop.cx - side(crop) / 2).toBeGreaterThanOrEqual(0);
    expect(crop.cy - side(crop) / 2).toBeGreaterThanOrEqual(0);
  });
});
