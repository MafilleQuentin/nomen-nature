"""Variations de la direction E (Courbes de niveau) pour Nomen Nature.

E1 Atlas plein écran · E2 Carte d'état-major · E3 Strates.
Génère tools/maquettes/directions_e.html (envoyé ensuite dans Figma).
Les courbes représentent la richesse du vivant : plus elles sont serrées, plus la vie est dense.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from directions_def import (PCONT, LABELS, VB_Y0, VB_H, which, noise, contours, lines_to_d,
                            poly_path, fmt, icon, STATUS, SPECIES, GROUPS, contour_bg, proj)

HQ, BQ, MQ = "'Space Grotesk'", "'IBM Plex Sans'", "'IBM Plex Mono'"

# ---------------------------------------------------------------- terrain
_ELEV = {}

def elevation(cell):
    """Grid of 'richness' values: -0.3 at sea, rising inland, modulated by noise."""
    if cell in _ELEV:
        return _ELEV[cell]
    nx, ny = int(1000 / cell) + 2, int(VB_H / cell) + 2
    inside = [[(0 < i < nx and 0 < j < ny) and which(i * cell, VB_Y0 + j * cell) is not None
               for i in range(nx + 1)] for j in range(ny + 1)]
    INF = 10 ** 9
    dist = [[0.0 if not inside[j][i] else INF for i in range(nx + 1)] for j in range(ny + 1)]
    R2 = 1.4142
    # two-pass chamfer distance transform (smoother than 4-neighbour BFS)
    for j in range(ny + 1):
        for i in range(nx + 1):
            v = dist[j][i]
            if i > 0: v = min(v, dist[j][i - 1] + 1)
            if j > 0:
                v = min(v, dist[j - 1][i] + 1)
                if i > 0: v = min(v, dist[j - 1][i - 1] + R2)
                if i < nx: v = min(v, dist[j - 1][i + 1] + R2)
            dist[j][i] = v
    for j in range(ny, -1, -1):
        for i in range(nx, -1, -1):
            v = dist[j][i]
            if i < nx: v = min(v, dist[j][i + 1] + 1)
            if j < ny:
                v = min(v, dist[j + 1][i] + 1)
                if i < nx: v = min(v, dist[j + 1][i + 1] + R2)
                if i > 0: v = min(v, dist[j + 1][i - 1] + R2)
            dist[j][i] = v
    D = 28 / cell * 3.5
    vals = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            if not inside[j][i]:
                row.append(-0.3)
            else:
                n01 = max(0.0, min(1.0, (noise(i * cell, VB_Y0 + j * cell, 2.0) + 1) / 2))
                row.append((min(dist[j][i], D) / D) ** 0.8 * (0.35 + 0.65 * n01))
        vals.append(row)
    _ELEV[cell] = (nx, ny, vals)
    return _ELEV[cell]

LEVELS = [0.04 + 0.085 * n for n in range(11)]

def terrain(cell):
    nx, ny, vals = elevation(cell)
    res = contours(nx, ny, cell, lambda x, y: vals[int(round(y / cell))][int(round(x / cell))], LEVELS)
    return res

def closed(lines):
    return [l for l in lines if len(l) > 3 and abs(l[0][0] - l[-1][0]) < 1e-6 and abs(l[0][1] - l[-1][1]) < 1e-6]

def loops_d(lines, oy=VB_Y0, dx=0.0, dy=0.0):
    return "".join("M" + "L".join(f"{fmt(x + dx)} {fmt(y + oy + dy)}" for x, y in l[:-1]) + "Z" for l in lines)

def labels_svg(color, fs=12, font=MQ, upper=True, only=None):
    out = ""
    for t, lon, lat in LABELS:
        if only and t not in only:
            continue
        x, y = proj(lon, lat)
        out += (f'<text x="{fmt(x)}" y="{fmt(y)}" text-anchor="middle" style="font-family:{font}" font-size="{fs}" font-weight="600" '
                f'letter-spacing="1.2" fill="{color}">{t.upper() if upper else t}</text>')
    return out

def map_lines(w, h, vb=None, cell=3.5, highlight=None, labels=True, line="#4F8A6B", index="#7FC8A0",
              coast="#C9DCC9", land="#173D30", hl="#F2B85B", label_col="#F1EBDD"):
    res = terrain(cell)
    coast_d = "".join(poly_path(p) for k, polys in PCONT.items() if k != highlight for p in polys)
    out = f'<path d="{coast_d}" fill="{land}" stroke="{coast}" stroke-width="1.3" stroke-linejoin="round"/>'
    if highlight:
        hd = "".join(poly_path(p) for p in PCONT[highlight])
        out += f'<path d="{hd}" fill="#22503E" stroke="{hl}" stroke-width="2.4" stroke-linejoin="round"/>'
    for n, t in enumerate(LEVELS):
        dd = lines_to_d(res[t], 0, VB_Y0)
        if dd:
            ix = n % 3 == 2
            out += f'<path d="{dd}" fill="none" stroke="{index if ix else line}" stroke-width="{1.1 if ix else 0.7}" stroke-linejoin="round"/>'
    if labels:
        out += labels_svg(label_col, 12)
    vb = vb or f"0 {VB_Y0} 1000 {VB_H}"
    return f'<svg width="{w}" height="{h}" viewBox="{vb}" preserveAspectRatio="xMidYMid slice">{out}</svg>'

def map_hypso(w, h, bands, line, index, water, graticule, label_col, cell=3.5, shadow=None, vb=None, labels=True):
    res = terrain(cell)
    out = f'<rect x="0" y="{VB_Y0}" width="1000" height="{VB_H}" fill="{water}"/>'
    if graticule:
        for lon in range(-150, 181, 30):
            x, _ = proj(lon, 0)
            out += f'<line x1="{fmt(x)}" y1="{VB_Y0}" x2="{fmt(x)}" y2="{VB_Y0 + VB_H}" stroke="{graticule}" stroke-width="0.6"/>'
        for lat in range(-60, 61, 30):
            _, y = proj(0, lat)
            out += f'<line x1="0" y1="{fmt(y)}" x2="1000" y2="{fmt(y)}" stroke="{graticule}" stroke-width="0.6"/>'
            out += (f'<text x="6" y="{fmt(y - 3)}" style="font-family:{MQ}" font-size="9" fill="{label_col}">'
                    f'{abs(lat)}°{"N" if lat > 0 else ("S" if lat < 0 else "")}</text>')
    base = "".join(poly_path(p) for polys in PCONT.values() for p in polys)
    if shadow:
        out += f'<path d="{base}" transform="translate(2,3)" fill="{shadow}" fill-opacity="0.45"/>'
    out += f'<path d="{base}" fill="{bands[0]}" stroke="{index}" stroke-width="1" stroke-linejoin="round"/>'
    for n, t in enumerate(LEVELS):
        cl = closed(res[t])
        if not cl:
            continue
        if shadow:
            out += f'<path d="{loops_d(cl, dx=1.6, dy=2.4)}" fill="{shadow}" fill-opacity="0.45"/>'
        out += f'<path d="{loops_d(cl)}" fill="{bands[min(n + 1, len(bands) - 1)]}"/>'
        out += f'<path d="{lines_to_d(res[t], 0, VB_Y0)}" fill="none" stroke="{index if n % 3 == 2 else line}" stroke-width="{0.9 if n % 3 == 2 else 0.55}" stroke-linejoin="round"/>'
    if labels:
        out += labels_svg(label_col, 11)
    vb = vb or f"0 {VB_Y0} 1000 {VB_H}"
    return f'<svg width="{w}" height="{h}" viewBox="{vb}" preserveAspectRatio="xMidYMid slice">{out}</svg>'

def island(w, h, bands, line=None, shadow=None, seed=1, cell=6, n_levels=9, cx=0.55, cy=0.5, spread=1.0):
    """Closed-loop relief (an island) filling a w x h box."""
    rnd = random.Random(seed)
    ox, oy = rnd.uniform(0, 500), rnd.uniform(0, 500)
    nx, ny = int(w / cell), int(h / cell)
    def f(x, y):
        dx, dy = (x - w * cx) / (w * 0.42 * spread), (y - h * cy) / (h * 0.46 * spread)
        r = math.hypot(dx, dy)
        return (1 - r) * 0.9 + 0.35 * noise(x * 0.9 + ox, y * 0.9 + oy, 1.6)
    levels = [0.02 + 0.1 * k for k in range(n_levels)]
    res = contours(nx, ny, cell, f, levels)
    out = ""
    for k, t in enumerate(levels):
        cl = closed(res[t])
        if not cl:
            continue
        if shadow:
            out += f'<path d="{loops_d(cl, oy=0, dx=3, dy=5)}" fill="{shadow}" fill-opacity="0.5"/>'
        out += f'<path d="{loops_d(cl, oy=0)}" fill="{bands[min(k, len(bands) - 1)]}"/>'
        if line:
            out += f'<path d="{loops_d(cl, oy=0)}" fill="none" stroke="{line}" stroke-width="{1.2 if k % 3 == 2 else 0.7}"/>'
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}">{out}</svg>'

# ---------------------------------------------------------------- shared atoms
def badge(code, fs=12, style="dark"):
    label, bg, fg = STATUS[code]
    if style == "stamp":
        ink = {"CR": "#B3261E", "EN": "#A4461A", "VU": "#6E6000", "NT": "#56620A"}[code]
        return (f'<span style="display:inline-flex;color:{ink};border:1.5px solid {ink};font-family:{MQ};font-size:{fs}px;'
                f'font-weight:600;padding:3px 8px;letter-spacing:0.06em;text-transform:uppercase;">{code} · {label}</span>')
    return (f'<span style="display:inline-flex;background:{bg};color:{fg};font-family:{MQ};font-size:{fs}px;font-weight:600;'
            f'padding:4px 9px;border-radius:4px;">{code} · {label}</span>')

def logo(color, leaf, size=22):
    return (f'<div style="display:flex;align-items:center;gap:8px;">{icon("leaf", size + 4, leaf, 2.2)}'
            f'<span style="font-family:{HQ};font-weight:700;font-size:{size}px;color:{color};">Nomen</span></div>')

EU_SPECIES = SPECIES + [("Grand hamster", "Cricetus cricetus", "CR", "Mammifères"),
                        ("Vison d'Europe", "Mustela lutreola", "CR", "Mammifères")]

def thumb(size, seed, bg="#1B4434", line="#7FC8A0"):
    return (f'<div style="width:{size}px;height:{size}px;border-radius:8px;overflow:hidden;background:{bg};flex-shrink:0;">'
            f'{island(size, size, [bg, "#22503E", "#2A5E4A", "#336B53"], line=line, seed=seed, cell=4, n_levels=5)}</div>')

# ================================================================ E1 — Atlas plein écran
E1 = dict(bg="#0B2119", panel="#132F25", ink="#F1EBDD", muted="#B9C7BC", accent="#F2B85B", mint="#7FC8A0", line="#2F5C4A")
PANEL = f'background:rgba(19,47,37,0.94);border:1px solid #2F5C4A;border-radius:14px;'

def e1_row(sp, i):
    name, latin, code, group = sp
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #24493B;">{thumb(52, i + 3)}'
            f'<div style="flex:1;display:flex;flex-direction:column;gap:2px;"><span style="font-family:{HQ};font-weight:600;font-size:16px;color:{E1["ink"]};">{name}</span>'
            f'<span style="font-family:{BQ};font-style:italic;font-size:13px;color:{E1["muted"]};">{latin}</span></div>{badge(code, 11)}</div>')

def e1_desktop():
    e = E1
    stats = "".join(f'<div style="flex:1;display:flex;flex-direction:column;gap:2px;padding:12px;border:1px solid #2F5C4A;border-radius:10px;">'
                    f'<span style="font-family:{HQ};font-weight:700;font-size:24px;color:{c};">{v}</span>'
                    f'<span style="font-family:{MQ};font-size:11px;color:{e["muted"]};text-transform:uppercase;letter-spacing:0.06em;">{l}</span></div>'
                    for v, l, c in (("18 240", "espèces observées", e["ink"]), ("1 126", "menacées", e["accent"])))
    tabs = "".join(f'<span style="font-family:{BQ};font-weight:600;font-size:14px;padding:7px 12px;border-radius:999px;'
                   + (f'background:{e["ink"]};color:{e["bg"]};' if t == "Menacées" else f'color:{e["ink"]};border:1px solid #2F5C4A;') + f'">{t}</span>'
                   for t in ("Toutes", "Menacées", "Par groupe"))
    rows = "".join(e1_row(s, i) for i, s in enumerate(EU_SPECIES[:6]))
    pills = "".join(f'<span style="font-family:{BQ};font-weight:600;font-size:14px;padding:8px 14px;border-radius:999px;'
                    + (f'background:{e["accent"]};color:{e["bg"]};' if c == "Europe" else f'{PANEL}color:{e["ink"]};') + f'">{c}</span>'
                    for c in ("Monde", "Afrique", "Amérique du Nord", "Amérique du Sud", "Antarctique", "Asie", "Europe", "Océanie"))
    legend_lines = (f'<svg width="120" height="28" viewBox="0 0 120 28">'
                    + "".join(f'<path d="M0 {4 + k * 4} C 40 {k * 4 - 2}, 80 {k * 4 + 10}, 120 {4 + k * 4}" fill="none" stroke="{e["mint"] if k == 2 else "#4F8A6B"}" stroke-width="{1.2 if k == 2 else 0.8}"/>' for k in range(5))
                    + '</svg>')
    act = lambda label, ic, primary: (f'<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;font-family:{BQ};font-weight:600;font-size:15px;'
                                      + (f'background:{e["accent"]};color:{e["bg"]};' if primary else f'{PANEL}color:{e["ink"]};')
                                      + f'">{icon(ic, 20, e["bg"] if primary else e["ink"])}<span>{label}</span></div>')
    return f'''
<div class="screen" style="width:1440px;height:900px;background:{e["bg"]};position:relative;overflow:hidden;">
  <div style="position:absolute;left:0;top:0;">{contour_bg(1440, 900, "#163A2D", 14, 0.9)}</div>
  <div style="position:absolute;left:-60px;top:70px;">{map_lines(1560, 734, highlight="europe")}</div>
  <div style="position:absolute;left:20px;top:20px;display:flex;align-items:center;gap:16px;{PANEL}padding:10px 12px 10px 18px;">
    {logo(e["ink"], e["mint"])}
    <div style="width:470px;display:flex;align-items:center;gap:10px;background:{e["bg"]};border:1px solid #2F5C4A;border-radius:10px;padding:11px 14px;">
      {icon("search", 20, e["ink"])}<span style="font-family:{BQ};font-size:16px;color:{e["muted"]};">Cherche une espèce : chêne, renard, morille…</span></div>
  </div>
  <div style="position:absolute;right:440px;top:20px;display:flex;gap:10px;">
    <div style="{PANEL}padding:12px 14px;display:flex;align-items:center;gap:8px;font-family:{BQ};font-weight:600;font-size:14px;color:{e["ink"]};">{icon("globe", 18, e["ink"])}FR</div>
    <div style="{PANEL}padding:12px;">{icon("menu", 20, e["ink"])}</div>
  </div>
  <div style="position:absolute;left:20px;top:96px;display:flex;flex-direction:column;gap:10px;">
    {act("Autour de moi", "pin", True)}{act("Identifier une plante", "camera", False)}
  </div>
  <div style="position:absolute;right:20px;top:20px;width:400px;height:860px;{PANEL}padding:22px;display:flex;flex-direction:column;gap:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:{MQ};font-size:12px;color:{e["mint"]};letter-spacing:0.1em;text-transform:uppercase;">Continent · 52°N 15°E</span>
      <span style="font-family:{MQ};font-size:18px;color:{e["muted"]};">×</span></div>
    <div style="font-family:{HQ};font-weight:700;font-size:36px;color:{e["ink"]};line-height:1;">Europe</div>
    <div style="font-family:{BQ};font-size:14px;line-height:1.5;color:{e["muted"]};">Les courbes serrées montrent où la vie est la plus riche : forêts des Carpates, Alpes, Méditerranée.</div>
    <div style="display:flex;gap:10px;">{stats}</div>
    <div style="display:flex;gap:8px;">{tabs}</div>
    <div style="display:flex;flex-direction:column;">{rows}</div>
    <div style="margin-top:auto;display:flex;justify-content:center;padding:12px;border:1px solid {e["ink"]};border-radius:10px;font-family:{BQ};font-weight:600;font-size:15px;color:{e["ink"]};">Voir les 1 126 espèces menacées d'Europe</div>
  </div>
  <div style="position:absolute;left:20px;bottom:20px;width:300px;{PANEL}padding:16px;display:flex;flex-direction:column;gap:10px;">
    <span style="font-family:{MQ};font-size:11px;color:{e["mint"]};letter-spacing:0.1em;text-transform:uppercase;">Lire la carte</span>
    <div style="display:flex;align-items:center;gap:12px;">{legend_lines}<span style="font-family:{BQ};font-size:13px;line-height:1.4;color:{e["ink"]};">Plus les courbes sont serrées, plus la vie est riche</span></div>
    <div style="display:flex;align-items:center;gap:10px;"><div style="width:90px;height:6px;border:1px solid {e["ink"]};border-top:none;"></div><span style="font-family:{MQ};font-size:11px;color:{e["muted"]};">2 000 km</span></div>
  </div>
  <div style="position:absolute;left:340px;bottom:20px;display:flex;flex-wrap:wrap;gap:8px;width:640px;">{pills}</div>
  <div style="position:absolute;left:944px;bottom:120px;display:flex;flex-direction:column;gap:8px;">
    <div style="{PANEL}width:44px;height:44px;display:flex;align-items:center;justify-content:center;">{icon("plus", 20, e["ink"])}</div>
    <div style="{PANEL}width:44px;height:44px;display:flex;align-items:center;justify-content:center;">{icon("minus", 20, e["ink"])}</div>
  </div>
</div>'''

def e1_mobile():
    e = E1
    rows = "".join(e1_row(s, i) for i, s in enumerate(EU_SPECIES[:3]))
    return f'''
<div class="screen" style="width:390px;height:844px;background:{e["bg"]};position:relative;overflow:hidden;">
  <div style="position:absolute;left:0;top:0;">{contour_bg(390, 844, "#163A2D", 10, 1.1)}</div>
  <div style="position:absolute;left:0;top:40px;">{map_lines(390, 470, vb="420 60 260 313", highlight="europe", labels=False)}</div>
  <div style="position:absolute;left:14px;right:14px;top:14px;display:flex;align-items:center;gap:10px;{PANEL}padding:10px 12px;">
    {icon("leaf", 24, e["mint"], 2.2)}<span style="flex:1;font-family:{BQ};font-size:15px;color:{e["muted"]};">Chêne, renard, morille…</span>{icon("search", 20, e["ink"])}</div>
  <div style="position:absolute;right:14px;top:84px;display:flex;flex-direction:column;gap:10px;">
    <div style="width:52px;height:52px;border-radius:14px;background:{e["accent"]};display:flex;align-items:center;justify-content:center;">{icon("pin", 24, e["bg"])}</div>
    <div style="width:52px;height:52px;{PANEL}display:flex;align-items:center;justify-content:center;">{icon("camera", 24, e["ink"])}</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:400px;background:{e["panel"]};border-top:1px solid #2F5C4A;border-radius:22px 22px 0 0;padding:10px 20px 20px;display:flex;flex-direction:column;gap:12px;">
    <div style="align-self:center;width:44px;height:5px;border-radius:3px;background:#4F8A6B;"></div>
    <span style="font-family:{MQ};font-size:11px;color:{e["mint"]};letter-spacing:0.1em;text-transform:uppercase;">Continent · 52°N 15°E</span>
    <div style="display:flex;justify-content:space-between;align-items:baseline;"><span style="font-family:{HQ};font-weight:700;font-size:28px;color:{e["ink"]};">Europe</span>
      <span style="font-family:{MQ};font-size:12px;color:{e["accent"]};">1 126 menacées</span></div>
    <div style="display:flex;flex-direction:column;">{rows}</div>
  </div>
</div>'''

# ================================================================ E2 — Carte d'état-major (claire, éditoriale)
E2 = dict(paper="#F2EEE4", ink="#1D2B24", muted="#55604F", red="#A63D25", brown="#7A5A35", water="#E1E8E0",
          bands=["#E3EBCF", "#D5E3BC", "#C7DAA6", "#DCD5A3", "#D3C08C", "#C7AA77", "#B89266", "#A47C58", "#8E6A4E", "#7A5A44", "#6A4D3B", "#5C4334"],
          line="#B39A72")

def e2_section(num, title, extra=""):
    e = E2
    return (f'<div style="display:flex;align-items:baseline;gap:18px;border-top:1.5px solid {e["ink"]};padding-top:14px;">'
            f'<span style="font-family:{MQ};font-size:14px;color:{e["red"]};">{num}</span>'
            f'<span style="font-family:{HQ};font-weight:700;font-size:34px;color:{e["ink"]};letter-spacing:-0.01em;">{title}</span>'
            f'<span style="margin-left:auto;font-family:{MQ};font-size:13px;color:{e["muted"]};">{extra}</span></div>')

def e2_specimen(sp, i, w):
    e = E2
    name, latin, code, group = sp
    field = lambda k, v: (f'<div style="display:flex;justify-content:space-between;gap:8px;font-family:{MQ};font-size:12px;">'
                          f'<span style="color:{e["muted"]};">{k}</span><span style="color:{e["ink"]};">{v}</span></div>')
    locs = [("Rhône, Genève", "46.20°N 6.14°E"), ("Jura vaudois", "46.68°N 6.31°E"), ("Doubs", "47.33°N 6.95°E"), ("Bolle di Magadino", "46.16°N 8.86°E")]
    loc, coord = locs[i % 4]
    return (f'<div style="width:{w}px;background:#FBF9F3;border:1px solid {e["ink"]};padding:14px;display:flex;flex-direction:column;gap:10px;flex-shrink:0;">'
            f'<div style="display:flex;justify-content:space-between;font-family:{MQ};font-size:11px;color:{e["muted"]};letter-spacing:0.08em;text-transform:uppercase;">'
            f'<span>N° {i + 1:04d}</span><span>{group}</span></div>'
            f'<div style="height:{int(w * 0.5)}px;overflow:hidden;border:1px solid #D9D2C2;">{island(w - 30, int(w * 0.5), e["bands"], line=e["line"], seed=i + 11, cell=5, n_levels=8)}</div>'
            f'<div style="display:flex;flex-direction:column;gap:2px;"><span style="font-family:{HQ};font-weight:700;font-size:18px;color:{e["ink"]};line-height:1.2;">{name}</span>'
            f'<span style="font-family:{BQ};font-style:italic;font-size:14px;color:{e["muted"]};">{latin}</span></div>'
            f'<div style="border-top:1px dashed #B3AA96;padding-top:8px;display:flex;flex-direction:column;gap:4px;">{field("Observée", loc)}{field("Coord.", coord)}</div>'
            f'<div>{badge(code, 11, "stamp")}</div></div>')

GROUP_COUNTS = ["6 495", "11 017", "12 060", "8 615", "36 367", "1 053 578", "52 309", "85 000", "73 300", "352 000", "10 560", "12 000", "148 000"]

def e2_index(cols):
    e = E2
    items = [(g, GROUP_COUNTS[k]) for k, g in enumerate(GROUPS)]
    per = math.ceil(len(items) / cols)
    col_html = ""
    for c in range(cols):
        rows = "".join(f'<div style="display:flex;align-items:baseline;gap:8px;padding:8px 0;border-bottom:1px solid #DDD5C4;">'
                       f'<span style="font-family:{BQ};font-weight:600;font-size:16px;color:{e["ink"]};">{g}</span>'
                       f'<span style="flex:1;border-bottom:1.5px dotted #B3AA96;transform:translateY(-4px);"></span>'
                       f'<span style="font-family:{MQ};font-size:13px;color:{e["muted"]};">{n}</span></div>'
                       for g, n in items[c * per:(c + 1) * per])
        col_html += f'<div style="flex:1;display:flex;flex-direction:column;">{rows}</div>'
    return f'<div style="display:flex;gap:48px;">{col_html}</div>'

def e2_legend(vertical=True):
    e = E2
    sw = "".join(f'<div style="width:22px;height:14px;background:{c};border:0.5px solid #B3AA96;"></div>' for c in e["bands"][:9])
    return (f'<div style="display:flex;flex-direction:column;gap:10px;">'
            f'<span style="font-family:{MQ};font-size:11px;color:{e["muted"]};letter-spacing:0.1em;text-transform:uppercase;">Légende</span>'
            f'<div style="display:flex;gap:2px;">{sw}</div>'
            f'<div style="display:flex;justify-content:space-between;font-family:{MQ};font-size:11px;color:{e["muted"]};width:216px;"><span>Peu d\'espèces</span><span>Beaucoup</span></div>'
            f'<span style="font-family:{BQ};font-size:13px;line-height:1.45;color:{e["ink"]};width:216px;">Chaque courbe marque un palier de richesse du vivant. Les teintes vont du vert (peu d\'espèces observées) au brun (zones les plus riches).</span>'
            f'<div style="display:flex;align-items:center;gap:8px;"><div style="width:80px;height:6px;border:1px solid {e["ink"]};border-top:none;"></div>'
            f'<span style="font-family:{MQ};font-size:11px;color:{e["muted"]};">Échelle 1:80 000 000</span></div></div>')

def e2_buttons(compact=False):
    e = E2
    p = "13px 18px" if compact else "14px 22px"
    return (f'<div style="display:flex;gap:12px;{"flex-direction:column;" if compact else ""}">'
            f'<div style="display:flex;align-items:center;gap:10px;background:{e["ink"]};color:{e["paper"]};padding:{p};font-family:{BQ};font-weight:600;font-size:15px;">{icon("pin", 20, e["paper"])}<span>Autour de moi</span></div>'
            f'<div style="display:flex;align-items:center;gap:10px;border:1.5px solid {e["ink"]};color:{e["ink"]};padding:{p};font-family:{BQ};font-weight:600;font-size:15px;">{icon("camera", 20, e["ink"])}<span>Identifier une plante</span></div></div>')

def e2_search(w, compact=False):
    e = E2
    ph = "Chêne, renard, morille…" if compact else "Cherche une espèce : chêne, renard, morille…"
    return (f'<div style="width:{w}px;display:flex;align-items:center;gap:12px;background:#FBF9F3;border:1.5px solid {e["ink"]};padding:{"12px 14px" if compact else "15px 18px"};">'
            f'{icon("search", 20, e["ink"])}<span style="font-family:{BQ};font-size:{15 if compact else 17}px;color:{e["muted"]};">{ph}</span></div>')

def e2_desktop():
    e = E2
    nav = "".join(f'<span>{t}</span>' for t in ("Explorer", "Identifier", "Menacées", "Groupes", "À propos"))
    return f'''
<div class="screen" style="width:1440px;background:{e["paper"]};position:relative;overflow:hidden;">
  <div style="display:flex;justify-content:space-between;padding:10px 80px;border-bottom:1px solid #D9D2C2;font-family:{MQ};font-size:11px;letter-spacing:0.1em;color:{e["muted"]};text-transform:uppercase;">
    <span>Nomen Nature · Atlas du vivant</span><span>Édition 2026 · Feuille 1/1</span><span>Données GBIF · UICN · Wikipédia</span></div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 80px;border-bottom:1.5px solid {e["ink"]};">
    {logo(e["ink"], e["red"], 24)}
    <div style="display:flex;gap:34px;font-family:{MQ};font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:{e["ink"]};">{nav}</div>
    <span style="font-family:{MQ};font-size:13px;color:{e["ink"]};">FR / EN</span></div>
  <div style="display:flex;gap:56px;padding:56px 80px 40px;align-items:center;">
    <div style="width:600px;display:flex;flex-direction:column;gap:22px;">
      <span style="font-family:{MQ};font-size:13px;color:{e["red"]};letter-spacing:0.08em;">01 — ATLAS</span>
      <div style="font-family:{HQ};font-weight:700;font-size:62px;line-height:1.02;color:{e["ink"]};letter-spacing:-0.02em;">Apprends à nommer le vivant qui t'entoure</div>
      <div style="font-family:{BQ};font-size:18px;line-height:1.55;color:{e["muted"]};">Un atlas libre des animaux, des plantes et des champignons du monde entier, pour reconnaître ce qui vit près de chez toi et ce qui est menacé.</div>
      {e2_search(600)}
      {e2_buttons()}
    </div>
    <div style="flex:1;display:flex;flex-direction:column;gap:10px;">
      <div style="border:1.5px solid {e["ink"]};background:{e["water"]};height:440px;overflow:hidden;position:relative;">
        {island(648, 440, e["bands"], line=e["line"], seed=5, cell=5, n_levels=11, spread=1.05)}
        <span style="position:absolute;left:12px;top:10px;font-family:{MQ};font-size:11px;color:{e["muted"]};">46°12′N</span>
        <span style="position:absolute;right:12px;bottom:10px;font-family:{MQ};font-size:11px;color:{e["muted"]};">6°08′E</span></div>
      <span style="font-family:{MQ};font-size:12px;color:{e["muted"]};">Fig. 1 — Plus les courbes sont serrées, plus la vie est riche.</span>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:22px;padding:30px 80px 0;">
    {e2_section("02", "Explorer la carte", "Clique sur un continent")}
    <div style="display:flex;gap:28px;align-items:flex-start;">
      <div style="border:1.5px solid {e["ink"]};overflow:hidden;">{map_hypso(1000, 470, e["bands"], e["line"], e["brown"], e["water"], "#C9CFC4", e["ink"])}</div>
      {e2_legend()}
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:22px;padding:56px 80px 0;">
    {e2_section("03", "Menacées en Suisse", "Pays proposé selon ta langue · changer")}
    <div style="display:flex;gap:24px;">{"".join(e2_specimen(s, i, 302) for i, s in enumerate(SPECIES))}</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:22px;padding:56px 80px 64px;">
    {e2_section("04", "Explorer par groupe", "Espèces décrites dans le monde")}
    {e2_index(3)}
  </div>
  <div style="display:flex;justify-content:space-between;padding:22px 80px;border-top:1.5px solid {e["ink"]};font-family:{MQ};font-size:12px;color:{e["muted"]};">
    <span>Colophon — Nomen Nature, gratuit et sans publicité. Cartographie : Natural Earth. Données : GBIF, UICN, Wikipédia, Pl@ntNet.</span><span>À propos · Sources et crédits</span></div>
</div>'''

def e2_mobile():
    e = E2
    return f'''
<div class="screen" style="width:390px;background:{e["paper"]};overflow:hidden;">
  <div style="display:flex;justify-content:space-between;padding:8px 20px;border-bottom:1px solid #D9D2C2;font-family:{MQ};font-size:10px;letter-spacing:0.1em;color:{e["muted"]};text-transform:uppercase;"><span>Atlas du vivant</span><span>Feuille 1/1</span></div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1.5px solid {e["ink"]};">{logo(e["ink"], e["red"], 20)}{icon("menu", 24, e["ink"])}</div>
  <div style="display:flex;flex-direction:column;gap:16px;padding:24px 20px;">
    <span style="font-family:{MQ};font-size:12px;color:{e["red"]};">01 — ATLAS</span>
    <div style="font-family:{HQ};font-weight:700;font-size:34px;line-height:1.05;color:{e["ink"]};">Apprends à nommer le vivant qui t'entoure</div>
    <div style="border:1.5px solid {e["ink"]};background:{e["water"]};height:200px;overflow:hidden;">{island(347, 200, e["bands"], line=e["line"], seed=5, cell=4, n_levels=10)}</div>
    {e2_search(350, True)}
    {e2_buttons(True)}
  </div>
  <div style="display:flex;flex-direction:column;gap:14px;padding:8px 20px 0;">
    <div style="display:flex;align-items:baseline;gap:12px;border-top:1.5px solid {e["ink"]};padding-top:10px;"><span style="font-family:{MQ};font-size:12px;color:{e["red"]};">02</span><span style="font-family:{HQ};font-weight:700;font-size:24px;color:{e["ink"]};">Explorer la carte</span></div>
    <div style="border:1.5px solid {e["ink"]};overflow:hidden;">{map_hypso(347, 163, e["bands"], e["line"], e["brown"], e["water"], None, e["ink"], cell=7, labels=False)}</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:14px;padding:28px 0 0 20px;">
    <div style="display:flex;align-items:baseline;gap:12px;border-top:1.5px solid {e["ink"]};padding-top:10px;margin-right:20px;"><span style="font-family:{MQ};font-size:12px;color:{e["red"]};">03</span><span style="font-family:{HQ};font-weight:700;font-size:24px;color:{e["ink"]};">Menacées en Suisse</span></div>
    <div style="display:flex;gap:14px;">{"".join(e2_specimen(s, i, 240) for i, s in enumerate(SPECIES[:2]))}</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px;padding:28px 20px 32px;">
    <div style="display:flex;align-items:baseline;gap:12px;border-top:1.5px solid {e["ink"]};padding-top:10px;"><span style="font-family:{MQ};font-size:12px;color:{e["red"]};">04</span><span style="font-family:{HQ};font-weight:700;font-size:24px;color:{e["ink"]};">Explorer par groupe</span></div>
    {e2_index(1).replace("display:flex;gap:48px;", "display:flex;gap:0;")}
  </div>
</div>'''

# ================================================================ E3 — Strates (relief découpé, navigation latérale)
STRATA = ["#143528", "#1A4132", "#214E3C", "#295C47", "#336B53", "#3F7B60", "#4E8C6E", "#62A07F", "#7DB693", "#9FCDAB", "#C4E3C8"]
E3 = dict(bg="#0F2A21", side="#0B2119", ink="#F1EBDD", muted="#B9C7BC", accent="#F2B85B", mint="#7FC8A0", card="#163A2E")

def e3_nav_item(label, ic, active=False):
    e = E3
    st = f'background:{e["card"]};color:{e["ink"]};border-left:3px solid {e["accent"]};' if active else f'color:{e["muted"]};border-left:3px solid transparent;'
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;{st}font-family:{BQ};font-weight:600;font-size:15px;">'
            f'{icon(ic, 20, e["ink"] if active else e["muted"])}<span>{label}</span></div>')

def e3_card(sp, i, w):
    e = E3
    name, latin, code, group = sp
    h = int(w * 0.6)
    return (f'<div style="width:{w}px;background:{e["card"]};border-radius:14px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,0.35);flex-shrink:0;">'
            f'<div style="position:relative;height:{h}px;background:{STRATA[0]};">{island(w, h, STRATA[1:], shadow="#06140F", seed=i + 21, cell=5, n_levels=8)}'
            f'<div style="position:absolute;left:10px;top:10px;">{badge(code, 11)}</div></div>'
            f'<div style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:3px;">'
            f'<span style="font-family:{HQ};font-weight:600;font-size:17px;color:{e["ink"]};">{name}</span>'
            f'<span style="font-family:{BQ};font-style:italic;font-size:13px;color:{e["muted"]};">{latin}</span>'
            f'<span style="font-family:{MQ};font-size:11px;color:{e["muted"]};margin-top:6px;">{group} · Photo : auteur, licence</span></div></div>')

def e3_group_tile(g, n, k, w):
    e = E3
    return (f'<div style="position:relative;width:{w}px;height:110px;border-radius:14px;overflow:hidden;background:{STRATA[1]};flex-shrink:0;">'
            f'<div style="position:absolute;left:{w // 3}px;top:-10px;">{island(w, 130, STRATA[2:9], shadow="#06140F", seed=k + 40, cell=5, n_levels=6, cx=0.5, cy=0.5, spread=0.85)}</div>'
            f'<div style="position:absolute;left:14px;bottom:12px;display:flex;flex-direction:column;gap:2px;">'
            f'<span style="font-family:{HQ};font-weight:600;font-size:17px;color:{e["ink"]};">{g}</span>'
            f'<span style="font-family:{MQ};font-size:11px;color:{e["ink"]};">{n} espèces</span></div></div>')

def e3_desktop():
    e = E3
    groups = "".join(e3_group_tile(g, GROUP_COUNTS[k], k, 176) for k, g in enumerate(GROUPS[:12]))
    return f'''
<div class="screen" style="width:1440px;background:{e["bg"]};display:flex;overflow:hidden;">
  <div style="width:250px;flex-shrink:0;background:{e["side"]};display:flex;flex-direction:column;gap:6px;padding:26px 0;border-right:1px solid #24493B;">
    <div style="padding:0 20px 26px;">{logo(e["ink"], e["mint"], 24)}</div>
    {e3_nav_item("Explorer la carte", "globe", True)}{e3_nav_item("Autour de moi", "pin")}{e3_nav_item("Identifier une plante", "camera")}
    {e3_nav_item("Espèces menacées", "leaf")}{e3_nav_item("Rechercher", "search")}
    <div style="margin-top:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px;font-family:{MQ};font-size:12px;color:{e["muted"]};">
      <span>À propos</span><span>Sources et crédits</span><span>FR / EN</span></div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;">
    <div style="position:relative;height:560px;background:{STRATA[0]};overflow:hidden;">
      <div style="position:absolute;left:300px;top:-40px;">{island(900, 640, STRATA[1:], shadow="#06140F", seed=3, cell=7, n_levels=10, cx=0.55, cy=0.5)}</div>
      <div style="position:absolute;left:56px;top:70px;width:560px;display:flex;flex-direction:column;gap:20px;">
        <span style="font-family:{MQ};font-size:13px;color:{e["mint"]};letter-spacing:0.12em;text-transform:uppercase;">Atlas du vivant</span>
        <div style="font-family:{HQ};font-weight:700;font-size:60px;line-height:1.02;color:{e["ink"]};letter-spacing:-0.02em;">Apprends à nommer le vivant qui t'entoure</div>
        <div style="font-family:{BQ};font-size:18px;line-height:1.55;color:{e["ink"]};">Chaque strate de ce relief est un palier de richesse du vivant. Plus on monte, plus la vie foisonne.</div>
        <div style="width:520px;display:flex;align-items:center;gap:12px;background:rgba(11,33,25,0.9);border:1px solid #4F8A6B;border-radius:12px;padding:15px 18px;">
          {icon("search", 20, e["ink"])}<span style="font-family:{BQ};font-size:17px;color:{e["muted"]};">Cherche une espèce : chêne, renard, morille…</span></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:20px;padding:48px 56px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <span style="font-family:{HQ};font-weight:700;font-size:32px;color:{e["ink"]};">La carte du vivant</span>
        <span style="font-family:{MQ};font-size:13px;color:{e["muted"]};">Clique sur un continent pour l'explorer</span></div>
      <div style="border-radius:18px;overflow:hidden;box-shadow:0 14px 30px rgba(0,0,0,0.4);">{map_hypso(1078, 507, STRATA, "#0F2A21", "#0B2119", "#0B2119", None, e["ink"], shadow="#030B08")}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:20px;padding:52px 56px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <span style="font-family:{HQ};font-weight:700;font-size:32px;color:{e["ink"]};">Menacées en Suisse</span>
        <span style="font-family:{BQ};font-weight:600;font-size:15px;color:{e["accent"]};">Voir toutes les espèces menacées →</span></div>
      <div style="display:flex;gap:22px;">{"".join(e3_card(s, i, 252) for i, s in enumerate(SPECIES))}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:20px;padding:52px 56px 60px;">
      <span style="font-family:{HQ};font-weight:700;font-size:32px;color:{e["ink"]};">Explorer par groupe</span>
      <div style="display:flex;flex-wrap:wrap;gap:16px;width:1090px;">{groups}</div>
    </div>
  </div>
</div>'''

def e3_mobile():
    e = E3
    tab = lambda label, ic, active=False: (f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;font-family:{BQ};font-weight:600;font-size:11px;'
                                           f'color:{e["accent"] if active else e["muted"]};">{icon(ic, 22, e["accent"] if active else e["muted"])}<span>{label}</span></div>')
    return f'''
<div class="screen" style="width:390px;height:1100px;background:{e["bg"]};position:relative;overflow:hidden;">
  <div style="position:relative;height:430px;background:{STRATA[0]};overflow:hidden;">
    <div style="position:absolute;left:-40px;top:120px;">{island(480, 360, STRATA[1:], shadow="#06140F", seed=3, cell=6, n_levels=10)}</div>
    <div style="position:absolute;left:20px;right:20px;top:18px;display:flex;justify-content:space-between;align-items:center;">{logo(e["ink"], e["mint"], 20)}{icon("globe", 22, e["ink"])}</div>
    <div style="position:absolute;left:20px;right:20px;top:72px;display:flex;flex-direction:column;gap:14px;">
      <div style="font-family:{HQ};font-weight:700;font-size:34px;line-height:1.05;color:{e["ink"]};">Apprends à nommer le vivant qui t'entoure</div>
      <div style="display:flex;align-items:center;gap:10px;background:rgba(11,33,25,0.92);border:1px solid #4F8A6B;border-radius:12px;padding:12px 14px;">
        {icon("search", 20, e["ink"])}<span style="font-family:{BQ};font-size:15px;color:{e["muted"]};">Chêne, renard, morille…</span></div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px;padding:24px 20px 0;">
    <span style="font-family:{HQ};font-weight:700;font-size:22px;color:{e["ink"]};">La carte du vivant</span>
    <div style="border-radius:14px;overflow:hidden;">{map_hypso(350, 165, STRATA, "#0F2A21", "#0B2119", "#0B2119", None, e["ink"], cell=7, shadow="#030B08", labels=False)}</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px;padding:24px 0 0 20px;">
    <span style="font-family:{HQ};font-weight:700;font-size:22px;color:{e["ink"]};">Menacées en Suisse</span>
    <div style="display:flex;gap:14px;">{"".join(e3_card(s, i, 220) for i, s in enumerate(SPECIES[:2]))}</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;display:flex;background:{e["side"]};border-top:1px solid #24493B;padding:6px 8px 18px;">
    {tab("Explorer", "globe", True)}{tab("Autour de moi", "pin")}{tab("Identifier", "camera")}{tab("Menacées", "leaf")}</div>
</div>'''

# ================================================================ planches de présentation
def card_intro(title, subtitle, bullets):
    lis = "".join(f'<li style="margin-bottom:8px;">{b}</li>' for b in bullets)
    return (f'<div class="screen" style="width:520px;background:#FFFFFF;padding:36px;display:flex;flex-direction:column;gap:14px;">'
            f'<div style="font-family:Inter;font-weight:700;font-size:28px;color:#1A1A1A;">{title}</div>'
            f'<div style="font-family:Inter;font-size:16px;line-height:1.5;color:#444;">{subtitle}</div>'
            f'<div style="font-family:Inter;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Ce qui change par rapport à E</div>'
            f'<ul style="font-family:Inter;font-size:15px;line-height:1.5;color:#1A1A1A;padding-left:20px;">{lis}</ul></div>')

INTROS = [
 ("E1 — Atlas plein écran", "La carte occupe tout l'écran, comme une application de cartographie. Tout le reste flotte par-dessus.",
  ["Plus de page qui défile : la carte est la page.", "Panneau latéral du continent choisi (statistiques, onglets, liste d'espèces) ; sur téléphone, un panneau qui monte du bas.",
   "Légende « Lire la carte », échelle, boutons de zoom, sélecteur de continents.", "Les courbes ont un sens : plus elles sont serrées, plus la vie est riche."]),
 ("E2 — Carte d'état-major", "Version claire inspirée des cartes topographiques imprimées : papier, encre, teintes d'altitude et mise en page éditoriale.",
  ["Fond papier clair au lieu du vert nuit.", "Continents en teintes hypsométriques (du vert au brun) avec quadrillage des latitudes.",
   "Sections numérotées 01 à 04, cartouche en haut, colophon en bas.", "Fiches d'espèces façon étiquettes de muséum (numéro, lieu, coordonnées, tampon de statut).",
   "Groupes présentés comme un index avec le nombre d'espèces."]),
 ("E3 — Strates", "Le relief devient physique : des couches découpées superposées, avec des ombres, comme une maquette en carton.",
  ["Navigation latérale fixe sur ordinateur, barre d'onglets en bas sur téléphone.", "Grand relief en strates dans l'en-tête.",
   "Carte du monde en strates avec ombres portées.", "Cartes d'espèces et tuiles de groupes en relief."]),
]

HEAD = ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Nomen Nature — variations E</title>'
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#E9E9E9;padding:40px;display:flex;flex-direction:column;gap:80px;width:max-content}'
        '.row{display:flex;gap:60px;align-items:flex-start}.screen{flex-shrink:0}</style></head><body>')

def write(name, body):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), name)
    with open(out, "w", encoding="utf-8") as f:
        f.write(HEAD + body + "</body></html>")
    print(out, os.path.getsize(out))

def main():
    # The E1 desktop screen is written to its own file: the Figma importer drops it when sent with the others.
    rows = [(INTROS[0], e1_mobile()), (INTROS[1], e2_mobile() + e2_desktop()), (INTROS[2], e3_mobile() + e3_desktop())]
    write("directions_e.html", "".join(f'<div class="row">{card_intro(*intro)}{screens}</div>' for intro, screens in rows))
    write("directions_e1_desktop.html", e1_desktop())


if __name__ == "__main__":
    main()
