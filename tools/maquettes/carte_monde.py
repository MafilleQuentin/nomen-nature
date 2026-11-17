"""Carte du monde de Nomen Nature à partir de Natural Earth (domaine public).

- Projection Equal Earth (surfaces respectées).
- Terres et pays : Natural Earth 1:110 m (tools/maquettes/data/, téléchargé, non versionné).
- Courbes de niveau : « richesse du vivant » FICTIVE pour les maquettes (distance à la côte + bruit).
  Sur le site, elles seront calculées à partir des observations GBIF.

Sorties (dans tools/maquettes/) :
- carte_monde.html : la carte en SVG, à envoyer dans Figma (html_to_figma, sélecteur .screen)
- carte_monde_points.json : positions projetées utiles aux écrans (pays, villes, continents, points d'observation)
"""
import json
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from directions_def import contours, lines_to_d, noise, fmt  # noqa: E402

W, H = 1232, 600
DATA = os.path.join(HERE, "data")
COLORS = {"land": "#1A4434", "border": "#2F5C4A", "coast": "#C9DCC9", "contour": "#4F8A6B", "index": "#7FC8A0"}

# ---------------------------------------------------------------- Equal Earth
A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796
M = math.sqrt(3) / 2
XMAX = 2 * math.sqrt(3) * math.pi / (3 * A1)
TH90 = math.asin(M)
YMAX = TH90 * (A1 + A2 * TH90 ** 2 + TH90 ** 6 * (A3 + A4 * TH90 ** 2))
S = W / (2 * XMAX)

def project(lon, lat):
    lam, phi = math.radians(lon), math.radians(lat)
    th = math.asin(M * math.sin(phi))
    t2, t6 = th * th, th ** 6
    x = 2 * math.sqrt(3) * lam * math.cos(th) / (3 * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)))
    y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    return W / 2 + x * S, H / 2 - y * S

def rings(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    return geom["coordinates"]

def ring_path(ring):
    pts = [project(lon, lat) for lon, lat in ring]
    return "M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + "Z"

def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)["features"]

countries = load("ne_110m_admin_0_countries.geojson")
land = load("ne_110m_land.geojson")

# ---------------------------------------------------------------- land mask (scanline)
CELL = 3.0
NX, NY = int(W / CELL), int(H / CELL)
land_rings = [[project(lon, lat) for lon, lat in ring] for feat in land for poly in rings(feat["geometry"]) for ring in poly[:1]]
mask = [[False] * (NX + 1) for _ in range(NY + 1)]
for j in range(NY + 1):
    y = j * CELL
    xs = []
    for ring in land_rings:
        for k in range(len(ring) - 1):
            (x1, y1), (x2, y2) = ring[k], ring[k + 1]
            if (y1 > y) != (y2 > y):
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
    xs.sort()
    for a, b in zip(xs[0::2], xs[1::2]):
        for i in range(max(0, int(math.ceil(a / CELL))), min(NX, int(b / CELL)) + 1):
            mask[j][i] = True

# ---------------------------------------------------------------- fictive richness field
INF = 1e9
dist = [[INF if mask[j][i] else 0.0 for i in range(NX + 1)] for j in range(NY + 1)]
R2 = 1.4142
for j in range(NY + 1):
    for i in range(NX + 1):
        v = dist[j][i]
        if i > 0: v = min(v, dist[j][i - 1] + 1)
        if j > 0:
            v = min(v, dist[j - 1][i] + 1)
            if i > 0: v = min(v, dist[j - 1][i - 1] + R2)
            if i < NX: v = min(v, dist[j - 1][i + 1] + R2)
        dist[j][i] = v
for j in range(NY, -1, -1):
    for i in range(NX, -1, -1):
        v = dist[j][i]
        if i < NX: v = min(v, dist[j][i + 1] + 1)
        if j < NY:
            v = min(v, dist[j + 1][i] + 1)
            if i < NX: v = min(v, dist[j + 1][i + 1] + R2)
            if i > 0: v = min(v, dist[j + 1][i - 1] + R2)
        dist[j][i] = v
D = 36 / CELL * 3

def blur(g, r, passes):
    """Separable box blur, applied `passes` times (approximates a gaussian)."""
    for _ in range(passes):
        h = [[sum(row[max(0, i - r):i + r + 1]) / len(row[max(0, i - r):i + r + 1]) for i in range(len(row))] for row in g]
        g = [[0.0] * len(h[0]) for _ in h]
        for i in range(len(h[0])):
            col = [h[j][i] for j in range(len(h))]
            for j in range(len(h)):
                seg = col[max(0, j - r):j + r + 1]
                g[j][i] = sum(seg) / len(seg)
    return g

near = blur([[min(dist[j][i], D) / D for i in range(NX + 1)] for j in range(NY + 1)], 3, 2)
field = [[(-0.3 if not mask[j][i] else
           0.55 * near[j][i] ** 0.7 + 0.45 * max(0.0, min(1.0, (noise(i * CELL * 1.3, j * CELL * 1.3, 2.4) + 1) / 2)) * min(1.0, near[j][i] * 4))
          for i in range(NX + 1)] for j in range(NY + 1)]
LEVELS = [0.04 + 0.085 * n for n in range(11)]
ok = lambda i, j: mask[j][i] and mask[j][i + 1] and mask[j + 1][i] and mask[j + 1][i + 1]
res = contours(NX, NY, CELL, lambda x, y: field[int(round(y / CELL))][int(round(x / CELL))], LEVELS, ok)
normal = "".join(lines_to_d(res[t]) for n, t in enumerate(LEVELS) if n % 3 != 2)
index = "".join(lines_to_d(res[t]) for n, t in enumerate(LEVELS) if n % 3 == 2)

# ---------------------------------------------------------------- SVG
CONT_ORDER = ["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Antarctica", "Seven seas (open ocean)"]
by_cont = {c: [] for c in CONT_ORDER}
for feat in countries:
    by_cont[feat["properties"]["CONTINENT"]].append(feat)
parts = []
for c in CONT_ORDER:
    d = "".join(ring_path(ring) for feat in by_cont[c] for poly in rings(feat["geometry"]) for ring in poly)
    if d:
        parts.append(f'<path data-continent="{c}" d="{d}" fill="{COLORS["land"]}" stroke="{COLORS["border"]}" stroke-width="0.6" stroke-linejoin="round"/>')
parts.append(f'<path d="{normal}" fill="none" stroke="{COLORS["contour"]}" stroke-width="0.7" stroke-linejoin="round"/>')
parts.append(f'<path d="{index}" fill="none" stroke="{COLORS["index"]}" stroke-width="1.1" stroke-linejoin="round"/>')
coast = "".join(ring_path(ring) for feat in land for poly in rings(feat["geometry"]) for ring in poly)
parts.append(f'<path d="{coast}" fill="none" stroke="{COLORS["coast"]}" stroke-width="1.1" stroke-linejoin="round"/>')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{"".join(parts)}</svg>'

html = ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Carte du monde</title>'
        '<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0B2119;padding:40px;width:max-content}</style></head>'
        f'<body><div class="screen" style="width:{W}px;height:{H}px;">{svg}</div></body></html>')
with open(os.path.join(HERE, "carte_monde.html"), "w", encoding="utf-8") as f:
    f.write(html)

# ---------------------------------------------------------------- useful points
P = lambda lon, lat: [round(v, 1) for v in project(lon, lat)]
points = {
    "size": [W, H],
    "continents": {"Amérique du Nord": P(-102, 47), "Amérique du Sud": P(-60, -14), "Europe": P(17, 55), "Afrique": P(19, 6),
                   "Asie": P(92, 50), "Océanie": P(134, -25), "Antarctique": P(0, -80)},
    "europe_center": P(14, 51),
    "pays": {"Suisse": P(8.2, 46.8), "France": P(2.4, 46.6), "Allemagne": P(10.4, 51.2), "Italie": P(12.6, 42.9), "Espagne": P(-3.7, 40.3),
             "Pologne": P(19.4, 52.1), "Royaume-Uni": P(-1.8, 52.8), "Suède": P(15.5, 62.5), "Norvège": P(9.5, 61.5)},
    "geneve": P(6.14, 46.2),
}
rnd = random.Random(11)
obs = []
while len(obs) < 120:
    lon, lat = rnd.uniform(-9, 42), rnd.uniform(37, 62)
    if lon > 30 and lat > 56:
        continue
    x, y = project(lon, lat)
    if mask[int(round(y / CELL))][int(round(x / CELL))]:
        obs.append([round(x, 1), round(y, 1)])
points["chene_observations"] = obs
with open(os.path.join(HERE, "carte_monde_points.json"), "w", encoding="utf-8") as f:
    json.dump(points, f, ensure_ascii=False, indent=1)
print("svg", len(svg), "contours", len(normal) + len(index), "points", len(obs))
