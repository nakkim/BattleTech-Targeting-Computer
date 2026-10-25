/** Pointy-top hex geometry, matching the rulebook diagrams. */

export interface Point {
  x: number;
  y: number;
}

/** Pixel center of an axial (q, r) hex with the given size (center to vertex). */
export const hexCenter = (q: number, r: number, size: number): Point => {
  return { x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r };
};

export const hexPoints = (center: Point, size: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 90) * Math.PI) / 180;
    pts.push(
      `${(center.x + size * Math.cos(a)).toFixed(2)},${(
        center.y +
        size * Math.sin(a)
      ).toFixed(2)}`
    );
  }
  return pts.join(" ");
};

/** All axial coordinates within the given radius of the origin. */
export const hexesWithin = (radius: number): { q: number; r: number }[] => {
  const out: { q: number; r: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (
      let r = Math.max(-radius, -q - radius);
      r <= Math.min(radius, -q + radius);
      r++
    )
      out.push({ q, r });
  }
  return out;
};

/** Bearing in degrees from the origin, 0 = straight ahead (up), positive = clockwise. */
export const bearing = (p: Point): number => {
  return (Math.atan2(p.x, -p.y) * 180) / Math.PI;
};

/** Flat-top variant, used by the Attack Direction Diagram (p. 22). */
export const flatHexCenter = (q: number, r: number, size: number): Point => {
  return { x: size * 1.5 * q, y: size * Math.sqrt(3) * (r + q / 2) };
};

export const flatHexPoints = (center: Point, size: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (60 * i * Math.PI) / 180;
    pts.push(
      `${(center.x + size * Math.cos(a)).toFixed(2)},${(
        center.y +
        size * Math.sin(a)
      ).toFixed(2)}`
    );
  }
  return pts.join(" ");
};
