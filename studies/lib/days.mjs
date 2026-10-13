// The calendar and the river, shared by the studies that draw every day.

export const DAY = 86400000;

// Hours of daylight at a latitude, from the sun's declination. No refraction, today's axial tilt.
export function daylight(dayOfYear, latitude) {
  const decl = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365.2425);
  const cosH = -Math.tan((latitude * Math.PI) / 180) * Math.tan((decl * Math.PI) / 180);
  return (24 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, cosH)));
}

// The top edge of each year's row, with a hairline between decades and a wider break between centuries.
export function yearRows(firstYear, lastYear, { cell, decadeGap, centuryGap }) {
  const rowY = [];
  let y = 0;
  for (let year = firstYear; year <= lastYear; year++) {
    if (year > firstYear && year % 100 === 0) y += centuryGap;
    else if (year > firstYear && year % 10 === 0) y += decadeGap;
    rowY.push(y);
    y += cell;
  }
  return { rowY, height: y };
}

// How far each row sits to the side: distance along the river gives the row,
// distance from the straight line between the reach's ends gives the shift.
// Same scale both ways. Returned in pixels, smallest shift at zero.
export function riverShift(course, rowY, height, { cell, latitude, reachEnd }) {
  let end = 0, best = Infinity;
  course.forEach(([lon, lat], k) => {
    const d = (lon - reachEnd[0]) ** 2 + (lat - reachEnd[1]) ** 2;
    if (d < best) [best, end] = [d, k];
  });
  const kx = 111320 * Math.cos((latitude * Math.PI) / 180), ky = 111132;
  const pts = course.slice(0, end + 1).map(([lon, lat]) => [lon * kx, lat * ky]);
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [ux, uy] = [(b[0] - a[0]) / chord, (b[1] - a[1]) / chord];
  const along = [0], across = [];
  pts.forEach(([px, py], k) => {
    if (k) along.push(along[k - 1] + Math.hypot(px - pts[k - 1][0], py - pts[k - 1][1]));
    across.push(-(px - a[0]) * uy + (py - a[1]) * ux); // map turned so downstream points down
  });
  const length = along[along.length - 1];
  let k = 0;
  const shift = rowY.map((top) => {
    const s = ((top + cell / 2) / height) * length;
    while (along[k + 1] < s) k++;
    const t = (s - along[k]) / (along[k + 1] - along[k]);
    return ((across[k] + (across[k + 1] - across[k]) * t) * height) / length;
  });
  const least = Math.min(...shift);
  return shift.map((s) => Math.round(s - least));
}
