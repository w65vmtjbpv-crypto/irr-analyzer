import { findBracket, hasMixedSigns, npv } from "@/lib/irr/shared";

export function calcIRR_Brent(
  cashflows: number[],
  lo = -0.5,
  hi = 1,
): number | null {
  if (!hasMixedSigns(cashflows)) {
    return null;
  }

  const bracket = findBracket(cashflows, lo, hi);

  if (!bracket) {
    return null;
  }

  let a = bracket.lo;
  let b = bracket.hi;
  let fa = npv(cashflows, a);
  let fb = npv(cashflows, b);

  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    return null;
  }

  if (fa === 0) {
    return a;
  }

  if (fb === 0) {
    return b;
  }

  if (fa * fb > 0) {
    return null;
  }

  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;

  for (let iteration = 0; iteration < 1000; iteration += 1) {
    if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
      c = a;
      fc = fa;
      d = b - a;
      e = d;
    }

    if (Math.abs(fc) < Math.abs(fb)) {
      a = b;
      b = c;
      c = a;
      fa = fb;
      fb = fc;
      fc = fa;
    }

    const tolerance = 2 * Number.EPSILON * Math.abs(b) + 1e-12;
    const midpoint = 0.5 * (c - b);

    if (Math.abs(midpoint) <= tolerance || fb === 0) {
      return b;
    }

    if (Math.abs(e) >= tolerance && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p = 0;
      let q = 0;

      if (a === c) {
        p = 2 * midpoint * s;
        q = 1 - s;
      } else {
        const qRatio = fa / fc;
        const rRatio = fb / fc;
        p =
          s *
          (2 * midpoint * qRatio * (qRatio - rRatio) - (b - a) * (rRatio - 1));
        q = (qRatio - 1) * (rRatio - 1) * (s - 1);
      }

      if (p > 0) {
        q = -q;
      } else {
        p = -p;
      }

      const accepted =
        2 * p <
        Math.min(
          3 * midpoint * q - Math.abs(tolerance * q),
          Math.abs(e * q),
        );

      if (accepted) {
        e = d;
        d = p / q;
      } else {
        d = midpoint;
        e = midpoint;
      }
    } else {
      d = midpoint;
      e = midpoint;
    }

    a = b;
    fa = fb;
    b += Math.abs(d) > tolerance ? d : midpoint > 0 ? tolerance : -tolerance;
    fb = npv(cashflows, b);

    if (!Number.isFinite(fb)) {
      return null;
    }
  }

  return null;
}
