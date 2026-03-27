# traverse_helpers.py
# Helper functions for traverse calculations

import math
from typing import Optional, Tuple

# Angle conversions
def g2r(g: float) -> float:
    """Convert grads to radians."""
    return g * (math.pi / 200.0)

def r2g(r: float) -> float:
    """Convert radians to grads."""
    return r * (200.0 / math.pi)

def atan_g(x: float) -> float:
    """Arctangent returning grads."""
    return r2g(math.atan(x))

def norm400(g: Optional[float]) -> Optional[float]:
    """Normalize an angle to [0, 400) grads."""
    if g is None:
        return None
    g = g % 400.0
    if g < 0:
        g += 400.0
    return g

def small_diff(a: Optional[float], b: Optional[float]) -> Optional[float]:
    """Smallest signed difference between two angles in grads."""
    if a is None or b is None:
        return None
    d = a - b
    while d > 200.0:
        d -= 400.0
    while d <= -200.0:
        d += 400.0
    return d

def azimuth_from_xy(xa: float, ya: float, xb: float, yb: float) -> Optional[float]:
    """Compute azimuth (grads) from point A to point B."""
    Dx, Dy = xb - xa, yb - ya
    if Dx == 0.0 and Dy == 0.0:
        return None
    if Dx == 0.0:
        return 0.0 if Dy > 0.0 else 200.0
    if Dy == 0.0:
        return 100.0 if Dx > 0.0 else 300.0
    a = atan_g(abs(Dx / Dy))
    if Dx > 0.0 and Dy > 0.0:
        G = a
    elif Dx > 0.0 and Dy < 0.0:
        G = 200.0 - a
    elif Dx < 0.0 and Dy < 0.0:
        G = 200.0 + a
    else:
        G = 400.0 - a
    return norm400(G)

def tri_them(Gprev: float, b: float) -> float:
    """Compute new azimuth after turning angle β to the right."""
    return norm400((Gprev + b + 200.0))

def dx_dy(S: float, G: float) -> Tuple[float, float]:
    """Compute coordinate increments from distance and azimuth."""
    return S * math.sin(g2r(G)), S * math.cos(g2r(G))