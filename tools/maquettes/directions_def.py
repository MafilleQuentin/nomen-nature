# Nomen Nature - directions D (Halftone), E (Contour lines), F (Liquid glass)
import math, os, random

VB_Y0, VB_H = 20, 470   # map viewBox: 0 20 1000 470

def proj(lon, lat):
    return (lon + 180) / 360 * 1000, (90 - lat) / 180 * 500

CONT = {
 "north_america": [
  [(-168,66),(-160,71),(-140,70),(-120,72),(-95,73),(-80,73),(-65,62),(-55,52),(-66,45),(-75,38),(-81,31),(-80,25),(-90,29),(-97,26),(-97,20),(-90,16),(-83,9),(-78,8),(-87,13),(-95,16),(-105,20),(-110,24),(-117,32),(-124,40),(-125,48),(-135,57),(-150,60),(-165,60)],
  [(-55,60),(-45,60),(-20,70),(-20,80),(-40,83),(-65,80),(-70,77),(-55,70)]],
 "south_america": [[(-78,8),(-72,12),(-62,11),(-50,2),(-35,-6),(-40,-22),(-48,-27),(-58,-38),(-65,-45),(-68,-55),(-74,-50),(-72,-35),(-71,-18),(-77,-10),(-81,-5),(-80,1)]],
 "europe": [
  [(-10,36),(-9,43),(-2,44),(-5,48),(2,51),(8,54),(5,58),(10,63),(20,70),(30,71),(40,68),(55,68),(60,55),(50,47),(40,45),(30,45),(28,41),(24,38),(20,40),(15,38),(12,44),(8,44),(3,42),(-5,36)],
  [(-5,50),(1,51),(-2,56),(-5,58),(-6,55)]],
 "africa": [
  [(-17,21),(-10,30),(-6,35),(10,37),(20,32),(32,31),(34,28),(43,12),(51,12),(42,-1),(40,-10),(35,-20),(33,-26),(26,-34),(19,-35),(15,-27),(12,-17),(13,-6),(9,3),(4,6),(-8,4),(-13,8),(-17,14)],
  [(44,-25),(47,-25),(50,-15),(49,-12),(44,-17)]],
 "asia": [
  [(40,45),(50,47),(60,55),(60,69),(70,73),(80,73),(100,78),(110,77),(130,73),(150,71),(180,69),(180,65),(163,60),(155,59),(141,59),(135,55),(142,54),(140,47),(130,43),(129,35),(126,37),(121,39),(122,30),(117,23),(108,21),(109,12),(104,10),(103,1),(100,13),(98,16),(92,21),(88,22),(80,15),(77,8),(73,20),(67,24),(62,25),(56,26),(58,22),(52,16),(43,13),(39,22),(35,32),(36,36),(28,41),(30,45)],
  [(130,31),(135,34),(141,38),(142,45),(140,42),(133,34)],
  [(95,5),(106,-6),(102,-4)],
  [(109,1),(117,7),(119,1),(116,-4),(110,-3)]],
 "oceania": [
  [(114,-22),(114,-34),(118,-35),(129,-32),(138,-35),(146,-39),(150,-37),(153,-28),(153,-25),(146,-19),(142,-11),(136,-12),(131,-11),(123,-16)],
  [(172,-35),(178,-38),(174,-41),(170,-46),(167,-46),(172,-41)],
  [(131,-1),(141,-3),(150,-10),(141,-9)]],
 "antarctica": [[(-180,-72),(-120,-73),(-60,-64),(-30,-77),(0,-70),(60,-67),(120,-66),(180,-72),(180,-86),(-180,-86)]],
}
PCONT = {k: [[proj(a, b) for a, b in p] for p in v] for k, v in CONT.items()}
LABELS = [("Amérique du Nord",-100,48),("Amérique du Sud",-60,-18),("Europe",18,52),("Afrique",20,6),("Asie",95,48),("Océanie",134,-26)]

def pip(x, y, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]; xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi:
            inside = not inside
        j = i
    return inside

def which(x, y):
    for k, polys in PCONT.items():
        for p in polys:
            if pip(x, y, p):
                return k
    return None

random.seed(7)
WAVES = [(random.uniform(0.6, 2.4), random.uniform(0, 2*math.pi), random.uniform(0, 2*math.pi), random.uniform(0.4, 1.0)) for _ in range(7)]
def noise(x, y, scale=1.0):
    v = 0.0
    for k, ang, ph, amp in WAVES:
        v += amp * math.sin((x * math.cos(ang) + y * math.sin(ang)) * k * scale / 100 + ph)
    return v / 3.2

def fmt(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")

def circle_path(cx, cy, r):
    return f"M{fmt(cx-r)} {fmt(cy)}a{fmt(r)} {fmt(r)} 0 1 0 {fmt(2*r)} 0a{fmt(r)} {fmt(r)} 0 1 0 {fmt(-2*r)} 0"

def poly_path(p):
    return "M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in p) + "Z"

# ---------- marching squares ----------
def contours(nx, ny, cell, field, levels, ok=None):
    vals = [[field(i*cell, j*cell) for i in range(nx+1)] for j in range(ny+1)]
    out = {}
    for t in levels:
        segs = []
        for j in range(ny):
            for i in range(nx):
                if ok and not ok(i, j):
                    continue
                v0, v1, v2, v3 = vals[j][i], vals[j][i+1], vals[j+1][i+1], vals[j+1][i]
                c = [(v0, v1, (i, j), (i+1, j)), (v1, v2, (i+1, j), (i+1, j+1)), (v2, v3, (i+1, j+1), (i, j+1)), (v3, v0, (i, j+1), (i, j))]
                pts = []
                for a, b, pa, pb in c:
                    if (a < t) != (b < t):
                        f = (t - a) / (b - a)
                        pts.append(((pa[0] + (pb[0]-pa[0])*f) * cell, (pa[1] + (pb[1]-pa[1])*f) * cell))
                if len(pts) == 2:
                    segs.append((pts[0], pts[1]))
                elif len(pts) == 4:
                    segs.append((pts[0], pts[1])); segs.append((pts[2], pts[3]))
        out[t] = chain(segs)
    return out

def chain(segs):
    key = lambda p: (round(p[0], 2), round(p[1], 2))
    adj = {}
    for idx, (a, b) in enumerate(segs):
        adj.setdefault(key(a), []).append(idx); adj.setdefault(key(b), []).append(idx)
    used = [False] * len(segs)
    lines = []
    for s in range(len(segs)):
        if used[s]:
            continue
        used[s] = True
        line = [segs[s][0], segs[s][1]]
        for direction in (1, 0):
            while True:
                end = line[-1] if direction else line[0]
                nxt = None
                for idx in adj.get(key(end), []):
                    if not used[idx]:
                        nxt = idx; break
                if nxt is None:
                    break
                used[nxt] = True
                a, b = segs[nxt]
                p = b if key(a) == key(end) else a
                if direction: line.append(p)
                else: line.insert(0, p)
        lines.append(line)
    return lines

def lines_to_d(lines, ox=0.0, oy=0.0):
    return "".join("M" + "L".join(f"{fmt(x+ox)} {fmt(y+oy)}" for x, y in l) for l in lines if len(l) > 2)

# ---------- map renderers ----------
def map_halftone(d, w, h, step):
    groups = {}
    y = VB_Y0 + step / 2
    while y < VB_Y0 + VB_H:
        x = step / 2 + ((int((y - VB_Y0) / step) % 2) * step / 2)
        while x < 1000:
            k = which(x, y)
            if k:
                tone = 0.55 + 0.45 * noise(x, y, 1.6)
                r = max(0.6, min(step * 0.5, step * 0.5 * tone))
                groups.setdefault(k, []).append(circle_path(x, y, r))
            x += step
        y += step * 0.866
    parts = "".join(f'<path d="{"".join(v)}" fill="{d["cont"][k]}"/>' for k, v in groups.items())
    return f'<svg width="{w}" height="{h}" viewBox="0 {VB_Y0} 1000 {VB_H}">{parts}{map_labels(d)}</svg>'

def map_contour(d, w, h, cell):
    nx, ny = int(1000 / cell), int(VB_H / cell)
    inside = [[which(i*cell, VB_Y0 + j*cell) for i in range(nx+1)] for j in range(ny+1)]
    def ok(i, j):
        k = inside[j][i]
        return k is not None and inside[j][i+1] == k and inside[j+1][i] == k and inside[j+1][i+1] == k
    levels = [-0.75 + 0.15 * n for n in range(11)]
    res = contours(nx, ny, cell, lambda x, y: noise(x, y + VB_Y0, 2.2), levels, ok)
    paths = ""
    for n, t in enumerate(levels):
        dd = lines_to_d(res[t], 0, VB_Y0)
        if dd:
            col = d["mint"] if n % 4 == 0 else d["line2"]
            sw = 1.4 if n % 4 == 0 else 0.8
            paths += f'<path d="{dd}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linejoin="round"/>'
    coast = "".join(poly_path(p) for polys in PCONT.values() for p in polys)
    coast_el = f'<path d="{coast}" fill="{d["land"]}" stroke="{d["coast"]}" stroke-width="1.6" stroke-linejoin="round"/>'
    return f'<svg width="{w}" height="{h}" viewBox="0 {VB_Y0} 1000 {VB_H}">{coast_el}{paths}{map_labels(d)}</svg>'

def map_glass(d, w, h):
    parts = "".join(f'<path d="{"".join(poly_path(p) for p in polys)}" fill="{d["cont"][k]}" fill-opacity="{0.45 if k == "antarctica" else 1}" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round"/>'
                    for k, polys in PCONT.items())
    return f'<svg width="{w}" height="{h}" viewBox="0 {VB_Y0} 1000 {VB_H}">{parts}{map_labels(d)}</svg>'

def map_labels(d):
    if not d.get("_labels", True):
        return ""
    out = ""
    for t, lon, lat in LABELS:
        x, y = proj(lon, lat)
        txt = t.upper() if d["style"] != "glass" else t
        out += (f'<text x="{fmt(x)}" y="{fmt(y)}" text-anchor="middle" style="font-family:{d["mapfont"]}" font-size="{d["mapfs"]}" '
                f'font-weight="700" letter-spacing="{d["mapls"]}" fill="{d["maplabel"]}">{txt}</text>')
    return out

def worldmap(d, w, h, labels=True, small=False):
    d["_labels"] = labels
    if d["style"] == "halftone":
        return map_halftone(d, w, h, 13 if small else 7.5)
    if d["style"] == "contour":
        return map_contour(d, w, h, 7 if small else 3.5)
    return map_glass(d, w, h)

# ---------- decorations ----------
def halftone_sun(size, color, step=12):
    R = size / 2
    dots = []
    y = step / 2
    while y < size:
        x = step / 2
        while x < size:
            dist = math.hypot(x - R, y - R) / R
            if dist < 1:
                r = step * 0.5 * (1 - dist) ** 0.7
                if r > 0.5:
                    dots.append(circle_path(x, y, r))
            x += step
        y += step
    return f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}"><path d="{"".join(dots)}" fill="{color}"/></svg>'

def halftone_photo(w, h, color, seed, step=7):
    rnd = random.Random(seed)
    cx, cy = rnd.uniform(0.35, 0.65) * w, rnd.uniform(0.4, 0.6) * h
    dots = []
    y = step / 2
    while y < h:
        x = step / 2 + (int(y / step) % 2) * step / 2
        while x < w:
            g = 0.25 + 0.5 * (x / w)
            blob = max(0, 1 - math.hypot((x - cx) / (w * 0.32), (y - cy) / (h * 0.42)))
            tone = min(1, g * 0.6 + blob * 0.9)
            r = step * 0.52 * tone
            if r > 0.4:
                dots.append(circle_path(x, y, r))
            x += step
        y += step * 0.866
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}"><path d="{"".join(dots)}" fill="{color}"/></svg>'

def contour_bg(w, h, color, cell=10, scale=1.3):
    nx, ny = int(w / cell), int(h / cell)
    levels = [-0.9 + 0.12 * n for n in range(16)]
    res = contours(nx, ny, cell, lambda x, y: noise(x * 0.7 + 300, y * 0.7 + 120, scale), levels)
    dd = "".join(lines_to_d(res[t]) for t in levels)
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}"><path d="{dd}" fill="none" stroke="{color}" stroke-width="1" stroke-linejoin="round"/></svg>'

# ---------- UI atoms ----------
ICONS = {
 "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 "pin": '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
 "camera": '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
 "leaf": '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
 "plus": '<path d="M5 12h14"/><path d="M12 5v14"/>',
 "minus": '<path d="M5 12h14"/>',
 "menu": '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
 "globe": '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
}
def icon(name, size, color, sw=2):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>')

STATUS = {"CR": ("En danger critique", "#D81E05", "#FFFFFF"), "EN": ("En danger", "#FC7F3F", "#1A1A1A"),
          "VU": ("Vulnérable", "#F9E814", "#1A1A1A"), "NT": ("Quasi menacée", "#CCE226", "#1A1A1A")}
SPECIES = [("Anguille européenne", "Anguilla anguilla", "CR", "Poissons"),
           ("Écrevisse à pattes blanches", "Austropotamobius pallipes", "EN", "Crustacés"),
           ("Moule perlière", "Margaritifera margaritifera", "EN", "Mollusques"),
           ("Cistude d'Europe", "Emys orbicularis", "NT", "Reptiles")]
GROUPS = ["Mammifères", "Oiseaux", "Reptiles", "Amphibiens", "Poissons", "Insectes", "Araignées", "Mollusques", "Arbres", "Fleurs", "Fougères", "Mousses", "Champignons"]
GLASS = "background:rgba(255,255,255,0.23);border:1px solid rgba(255,255,255,0.55);"

def badge(code, d, fs=12):
    label, bg, fg = STATUS[code]
    if d["style"] == "halftone":
        return (f'<span style="display:inline-flex;background:{bg};color:{fg};border:2px solid #141414;font-family:{d["mq"]};'
                f'font-size:{fs}px;font-weight:500;padding:3px 8px;text-transform:uppercase;letter-spacing:0.04em;">{code} · {label}</span>')
    if d["style"] == "contour":
        return (f'<span style="display:inline-flex;background:{bg};color:{fg};font-family:{d["mq"]};font-size:{fs}px;font-weight:600;'
                f'padding:4px 9px;border-radius:4px;letter-spacing:0.02em;">{code} · {label}</span>')
    return (f'<span style="display:inline-flex;background:{bg};color:{fg};font-family:{d["bq"]};font-size:{fs}px;font-weight:700;'
            f'padding:5px 11px;border-radius:999px;">{code} · {label}</span>')

def btn(label, ic, d, kind, big=True):
    p = "14px 22px" if big else "12px 14px"
    if d["style"] == "halftone":
        bg, fg = ("#141414", "#FFFFFF") if kind == "primary" else (d["accent"], "#141414")
        return (f'<div style="display:inline-flex;align-items:center;gap:10px;background:{bg};color:{fg};border:2px solid #141414;'
                f'box-shadow:4px 4px 0 #141414;padding:{p};font-family:{d["bq"]};font-weight:800;font-size:16px;text-transform:uppercase;letter-spacing:0.03em;">'
                f'{icon(ic, 20, fg)}<span>{label}</span></div>')
    if d["style"] == "contour":
        if kind == "primary":
            st = f'background:{d["accent"]};color:{d["bg"]};border:1.5px solid {d["accent"]};'; fg = d["bg"]
        else:
            st = f'background:transparent;color:{d["ink"]};border:1.5px solid {d["ink"]};'; fg = d["ink"]
        return (f'<div style="display:inline-flex;align-items:center;gap:10px;{st}border-radius:6px;padding:{p};font-family:{d["bq"]};'
                f'font-weight:600;font-size:16px;">{icon(ic, 20, fg)}<span>{label}</span></div>')
    if kind == "primary":
        st = f'background:{d["primary"]};color:#FFFFFF;border:1px solid rgba(255,255,255,0.35);'; fg = "#FFFFFF"
    else:
        st = GLASS + f'color:{d["ink"]};'; fg = d["ink"]
    return (f'<div style="display:inline-flex;align-items:center;gap:10px;{st}border-radius:999px;padding:{p};font-family:{d["bq"]};'
            f'font-weight:700;font-size:16px;">{icon(ic, 20, fg)}<span>{label}</span></div>')

def searchbar(d, w, compact=False):
    ph = "Chêne, renard, morille…" if compact else "Cherche une espèce : chêne, renard, morille…"
    pad = "12px 18px" if compact else "16px 22px"
    fs = 16 if compact else 18
    if d["style"] == "halftone":
        st = f"background:#FFFFFF;border:2px solid #141414;box-shadow:4px 4px 0 #141414;"; ic = "#141414"; col = "#4A4A44"
    elif d["style"] == "contour":
        st = f'background:{d["surface"]};border:1.5px solid {d["line2"]};border-radius:6px;'; ic = d["ink"]; col = d["muted"]
    else:
        st = GLASS + "border-radius:999px;"; ic = d["ink"]; col = d["ink"]
    return (f'<div style="width:{w}px;display:flex;align-items:center;gap:12px;{st}padding:{pad};">{icon("search", 22, ic)}'
            f'<span style="font-family:{d["bq"]};font-size:{fs}px;color:{col};">{ph}</span></div>')

def chip(g, d):
    if d["style"] == "halftone":
        st = "background:#FFFFFF;border:2px solid #141414;"; col = "#141414"
    elif d["style"] == "contour":
        st = f'background:transparent;border:1px solid {d["line2"]};border-radius:999px;'; col = d["ink"]
    else:
        st = GLASS + "border-radius:999px;"; col = d["ink"]
    return f'<div style="{st}padding:9px 15px;font-family:{d["bq"]};font-weight:600;font-size:15px;color:{col};">{g}</div>'

def logo(d, size):
    col = d["ink"] if d["style"] != "glass" else "#FFFFFF"
    word = "NOMEN" if d["style"] == "halftone" else "Nomen"
    return (f'<div style="display:flex;align-items:center;gap:8px;">{icon("leaf", size + 4, d["logo"], 2.2)}'
            f'<span style="font-family:{d["hq"]};font-weight:{d["hw"]};font-size:{size}px;color:{col};letter-spacing:{d["hls"]};">{word}</span></div>')

def title_html(d, fs, center=True):
    if d["style"] == "halftone":
        al = "center" if center else "flex-start"
        line = f'font-family:{d["hq"]};font-weight:900;font-size:{fs}px;line-height:1.02;color:#141414;text-transform:uppercase;letter-spacing:-0.02em;'
        return (f'<div style="display:flex;flex-direction:column;align-items:{al};gap:6px;">'
                f'<div style="{line}">Apprends à nommer</div>'
                f'<div style="{line}background:{d["primary"]};padding:2px 14px;">le vivant</div>'
                f'<div style="{line}">qui t\'entoure</div></div>')
    if d["style"] == "contour":
        return (f'<div style="font-family:{d["hq"]};font-weight:700;font-size:{fs}px;line-height:1.05;color:{d["ink"]};letter-spacing:-0.02em;">'
                f'Apprends à nommer <span style="color:{d["accent"]};">le vivant</span> qui t\'entoure</div>')
    return (f'<div style="font-family:{d["hq"]};font-weight:800;font-size:{fs}px;line-height:1.05;color:#FFFFFF;letter-spacing:-0.02em;">'
            f'Apprends à nommer <span style="font-family:\'Instrument Serif\';font-style:italic;font-weight:400;">le vivant</span> qui t\'entoure</div>')

def section_title(t, d, fs, dark_bg=False):
    if d["style"] == "halftone":
        return f'<div style="font-family:{d["hq"]};font-weight:900;font-size:{fs}px;color:#141414;text-transform:uppercase;letter-spacing:-0.01em;">{t}</div>'
    col = d["ink"]
    return f'<div style="font-family:{d["hq"]};font-weight:700;font-size:{fs}px;color:{col};letter-spacing:-0.01em;">{t}</div>'

def species_card(sp, d, w, idx):
    name, latin, code, group = sp
    ph = int(w * 0.62)
    if d["style"] == "halftone":
        photo = (f'<div style="position:relative;height:{ph}px;background:#FFFFFF;border-bottom:2px solid #141414;overflow:hidden;">'
                 f'{halftone_photo(w, ph, d["primary"] if idx % 2 == 0 else d["accent"], idx, 7 if w > 250 else 6)}'
                 f'<div style="position:absolute;left:10px;bottom:10px;">{badge(code, d)}</div></div>')
        wrap = "background:#FFFFFF;border:2px solid #141414;box-shadow:5px 5px 0 #141414;"
        ncol, mcol = "#141414", "#4A4A44"
    elif d["style"] == "contour":
        photo = (f'<div style="position:relative;height:{ph}px;background:linear-gradient(160deg,#1F4A3A,#2C5E49);overflow:hidden;">'
                 f'{contour_bg(w, ph, "rgba(127,200,160,0.35)", 8, 3.0)}'
                 f'<div style="position:absolute;left:10px;bottom:10px;">{badge(code, d)}</div></div>')
        wrap = f'background:{d["surface"]};border:1px solid {d["line"]};border-radius:8px;'
        ncol, mcol = d["ink"], d["muted"]
    else:
        photo = (f'<div style="height:{ph}px;margin:8px;border-radius:18px;background:linear-gradient(140deg,#A8D5B5,#4E9C78);'
                 f'display:flex;align-items:flex-end;padding:10px;">{badge(code, d)}</div>')
        wrap = GLASS + "border-radius:26px;"
        ncol, mcol = d["ink"], d["ink"]
    return (f'<div style="width:{w}px;{wrap}overflow:hidden;flex-shrink:0;">{photo}'
            f'<div style="padding:12px 16px 16px;display:flex;flex-direction:column;gap:4px;">'
            f'<div style="font-family:{d["hq"]};font-weight:700;font-size:18px;line-height:1.2;color:{ncol};">{name}</div>'
            f'<div style="font-family:{d["bq"]};font-style:italic;font-size:14px;color:{mcol};">{latin}</div>'
            f'<div style="font-family:{d["mq"]};font-size:12px;color:{mcol};margin-top:6px;">{group} · Photo : auteur, licence</div></div></div>')

def page_bg(d, w, h):
    if d["style"] == "halftone":
        return f'background:{d["bg"]};'
    if d["style"] == "contour":
        return f'background:{d["bg"]};'
    return ("background:radial-gradient(circle at 15% 30%, #3FA36F 0%, rgba(63,163,111,0) 38%),"
            "radial-gradient(circle at 85% 20%, #2C8C99 0%, rgba(44,140,153,0) 40%),"
            "radial-gradient(circle at 70% 70%, #F5D76E 0%, rgba(245,215,110,0) 30%),"
            "radial-gradient(circle at 25% 85%, #9BD17A 0%, rgba(155,209,122,0) 35%),"
            "linear-gradient(180deg, #0E3B2E 0%, #14563F 35%, #3C8F64 70%, #CFE6D8 100%);")

def map_box(d, w, h, small=False):
    if d["style"] == "halftone":
        st = "background:#FFFFFF;border:2px solid #141414;box-shadow:6px 6px 0 #141414;"
        lab_col = "#141414"
    elif d["style"] == "contour":
        st = f'background:{d["surface"]};border:1px solid {d["line"]};border-radius:10px;'
        lab_col = d["ink"]
    else:
        st = GLASS + "border-radius:32px;"
        lab_col = d["ink"]
    inner_w = w - (24 if small else 48)
    inner_h = h
    head = ""
    if not small:
        zb = lambda ic: (f'<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;'
                         + ("background:#FFFFFF;border:2px solid #141414;" if d["style"] == "halftone" else
                            (f'border:1px solid {d["line2"]};border-radius:6px;' if d["style"] == "contour" else GLASS + "border-radius:999px;"))
                         + f'">{icon(ic, 20, lab_col)}</div>')
        coord = (f'<span style="font-family:{d["mq"]};font-size:13px;color:{d["muted"]};">46.20°N · 6.14°E — Genève</span>'
                 if d["style"] == "contour" else "")
        head = (f'<div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px 10px;">'
                f'<span style="font-family:{d["mq"] if d["style"] != "glass" else d["bq"]};font-weight:600;font-size:14px;color:{lab_col};'
                f'{"text-transform:uppercase;letter-spacing:0.06em;" if d["style"] != "glass" else ""}">Clique sur un continent pour l\'explorer</span>'
                f'<div style="display:flex;align-items:center;gap:12px;">{coord}{zb("plus")}{zb("minus")}</div></div>')
    foot = "" if not small else (f'<div style="font-family:{d["bq"]};font-weight:700;font-size:13px;color:{lab_col};text-align:center;padding-top:6px;">'
                                 f'Touche un continent pour l\'explorer</div>')
    return (f'<div style="{st}padding:{12 if small else 24}px;">{head}{worldmap(d, inner_w, inner_h, labels=not small, small=small)}{foot}</div>')

def nav(d, mobile=False):
    col = d["ink"] if d["style"] != "glass" else "#FFFFFF"
    if d["style"] == "halftone":
        st = "border-bottom:2px solid #141414;background:" + d["bg"] + ";"
    elif d["style"] == "contour":
        st = f'border-bottom:1px solid {d["line"]};'
    else:
        st = ""
    if mobile:
        inner = (f'{logo(d, 22)}<div style="display:flex;align-items:center;gap:14px;">{icon("globe", 22, col)}{icon("menu", 24, col)}</div>')
        if d["style"] == "glass":
            return f'<div style="margin:12px 14px 0;{GLASS}border-radius:999px;display:flex;align-items:center;justify-content:space-between;padding:12px 18px;">{inner}</div>'
        return f'<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;{st}">{inner}</div>'
    links = "".join(f'<span>{t}</span>' for t in (["Explorer", "Identifier", "Espèces menacées", "À propos"]))
    tf = "text-transform:uppercase;letter-spacing:0.04em;font-size:14px;" if d["style"] == "halftone" else "font-size:16px;"
    linkfont = d["mq"] if d["style"] in ("halftone", "contour") else d["bq"]
    inner = (f'{logo(d, 26)}<div style="display:flex;gap:36px;font-family:{linkfont};font-weight:600;{tf}color:{col};">{links}</div>'
             f'<div style="display:flex;align-items:center;gap:8px;font-family:{d["bq"]};font-weight:700;font-size:15px;color:{col};">{icon("globe", 18, col)}<span>FR</span></div>')
    if d["style"] == "glass":
        return f'<div style="margin:20px 80px 0;{GLASS}border-radius:999px;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;">{inner}</div>'
    return f'<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 80px;{st}">{inner}</div>'

def desktop(d):
    deco = ""
    if d["style"] == "halftone":
        deco = f'<div style="position:absolute;right:-90px;top:40px;">{halftone_sun(460, d["accent"], 14)}</div><div style="position:absolute;left:-70px;top:330px;">{halftone_sun(220, d["primary"], 11)}</div>'
    elif d["style"] == "contour":
        deco = f'<div style="position:absolute;left:0;top:0;">{contour_bg(1440, 2100, d["line"], 12, 1.1)}</div>'
    sub_col = d["muted"] if d["style"] != "glass" else "rgba(255,255,255,0.88)"
    eyebrow = ""
    if d["style"] == "contour":
        eyebrow = f'<span style="font-family:{d["mq"]};font-size:14px;letter-spacing:0.12em;color:{d["mint"]};text-transform:uppercase;">Atlas du vivant · 1,5 million d\'espèces</span>'
    elif d["style"] == "halftone":
        eyebrow = f'<span style="font-family:{d["mq"]};font-size:14px;letter-spacing:0.1em;text-transform:uppercase;background:#141414;color:#FFFFFF;padding:4px 10px;">Encyclopédie libre du vivant · N°1</span>'
    else:
        eyebrow = f'<span style="{GLASS}border-radius:999px;padding:6px 14px;font-family:{d["bq"]};font-weight:600;font-size:14px;color:#FFFFFF;">Animaux · Plantes · Champignons</span>'
    footer_st = ("border-top:2px solid #141414;" if d["style"] == "halftone" else (f'border-top:1px solid {d["line"]};' if d["style"] == "contour" else ""))
    foot_col = d["muted"] if d["style"] != "glass" else d["ink"]
    footer_inner = (f'<span>Nomen Nature · gratuit et sans publicité · données GBIF, Wikipédia, UICN, Pl@ntNet</span><span>À propos · Sources et crédits · FR / EN</span>')
    footer = (f'<div style="display:flex;justify-content:space-between;align-items:center;padding:28px 80px;{footer_st}font-family:{d["mq"]};font-size:13px;color:{foot_col};">{footer_inner}</div>'
              if d["style"] != "glass" else
              f'<div style="margin:0 80px 32px;{GLASS}border-radius:999px;display:flex;justify-content:space-between;align-items:center;padding:18px 32px;font-family:{d["bq"]};font-size:13px;color:{d["ink"]};">{footer_inner}</div>')
    link_col = d["primary"] if d["style"] == "glass" else (d["accent"] if d["style"] == "contour" else "#141414")
    return f'''
<div class="screen" style="width:1440px;{page_bg(d, 1440, 2000)}position:relative;overflow:hidden;">
  {deco}
  <div style="position:relative;">{nav(d)}</div>
  <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:22px;padding:60px 80px 32px;text-align:center;">
    {eyebrow}
    <div style="max-width:920px;">{title_html(d, 64 if d["style"] == "halftone" else 58)}</div>
    <div style="font-family:{d["bq"]};font-size:19px;line-height:1.5;color:{sub_col};max-width:640px;">Animaux, plantes et champignons du monde entier : explore la carte, découvre ce qui vit près de chez toi et apprends à reconnaître les espèces menacées.</div>
    {searchbar(d, 720)}
    <div style="display:flex;gap:18px;">{btn("Autour de moi", "pin", d, "primary")}{btn("Identifier une plante", "camera", d, "secondary")}</div>
  </div>
  <div style="position:relative;margin:16px 80px 0;">{map_box(d, 1280, 560)}</div>
  <div style="position:relative;display:flex;flex-direction:column;gap:20px;padding:64px 80px 0;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="display:flex;flex-direction:column;gap:6px;">{section_title("Menacées en Suisse", d, 34)}
        <span style="font-family:{d["bq"]};font-size:16px;color:{d["muted"] if d["style"] != "glass" else d["ink"]};">Pays proposé selon la langue de ton navigateur · <span style="font-weight:700;text-decoration:underline;">changer</span></span></div>
      <span style="font-family:{d["bq"]};font-weight:700;font-size:16px;color:{link_col};">Voir toutes les espèces menacées →</span>
    </div>
    <div style="display:flex;gap:24px;">{"".join(species_card(s, d, 302, i) for i, s in enumerate(SPECIES))}</div>
  </div>
  <div style="position:relative;display:flex;flex-direction:column;gap:20px;padding:60px 80px 64px;">
    {section_title("Explorer par groupe", d, 34)}
    <div style="display:flex;flex-wrap:wrap;gap:12px;">{"".join(chip(g, d) for g in GROUPS)}</div>
  </div>
  {footer}
</div>'''

def mobile(d):
    deco = ""
    if d["style"] == "halftone":
        deco = f'<div style="position:absolute;right:-70px;top:60px;">{halftone_sun(220, d["accent"], 10)}</div>'
    elif d["style"] == "contour":
        deco = f'<div style="position:absolute;left:0;top:0;">{contour_bg(390, 1200, d["line"], 9, 1.4)}</div>'
    def mbtn(label, ic, kind):
        if d["style"] == "halftone":
            bg, fg = ("#141414", "#FFFFFF") if kind == "primary" else (d["accent"], "#141414")
            st = f"background:{bg};color:{fg};border:2px solid #141414;box-shadow:3px 3px 0 #141414;"
        elif d["style"] == "contour":
            fg = d["bg"] if kind == "primary" else d["ink"]
            st = (f'background:{d["accent"]};color:{fg};border-radius:6px;' if kind == "primary" else f'border:1.5px solid {d["ink"]};color:{fg};border-radius:6px;')
        else:
            fg = "#FFFFFF" if kind == "primary" else d["ink"]
            st = (f'background:{d["primary"]};color:#FFFFFF;border-radius:22px;' if kind == "primary" else GLASS + f'color:{d["ink"]};border-radius:22px;')
        return (f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;{st}padding:14px 8px;font-family:{d["bq"]};'
                f'font-weight:700;font-size:15px;">{icon(ic, 24, fg)}<span>{label}</span></div>')
    sec_pad = "padding:30px 0 0 20px;"
    return f'''
<div class="screen" style="width:390px;{page_bg(d, 390, 1200)}position:relative;overflow:hidden;">
  {deco}
  <div style="position:relative;">{nav(d, mobile=True)}</div>
  <div style="position:relative;display:flex;flex-direction:column;gap:16px;padding:26px 20px 16px;">
    {title_html(d, 36 if d["style"] == "halftone" else 34)}
    {searchbar(d, 350, compact=True)}
    <div style="display:flex;gap:10px;">{mbtn("Autour de moi", "pin", "primary")}{mbtn("Identifier une plante", "camera", "secondary")}</div>
  </div>
  <div style="position:relative;margin:0 20px;">{map_box(d, 350, 160, small=True)}</div>
  <div style="position:relative;display:flex;flex-direction:column;gap:14px;{sec_pad}">
    <div style="display:flex;justify-content:space-between;align-items:center;padding-right:20px;">{section_title("Menacées en Suisse", d, 22)}<span style="font-family:{d["bq"]};font-weight:700;font-size:14px;color:{d["ink"] if d["style"] != "contour" else d["accent"]};">Tout voir</span></div>
    <div style="display:flex;gap:14px;">{"".join(species_card(s, d, 220, i) for i, s in enumerate(SPECIES[:2]))}</div>
  </div>
  <div style="position:relative;display:flex;flex-direction:column;gap:14px;padding:30px 20px 30px;">
    {section_title("Explorer par groupe", d, 22)}
    <div style="display:flex;flex-wrap:wrap;gap:8px;">{"".join(chip(g, d) for g in GROUPS[:8])}</div>
  </div>
</div>'''

def tile(d):
    sw = "".join(f'<div style="display:flex;flex-direction:column;gap:6px;width:120px;"><div style="height:64px;border-radius:8px;background:{c};border:1px solid #DDD;"></div>'
                 f'<span style="font-family:Inter;font-size:13px;font-weight:600;color:#1A1A1A;">{n}</span><span style="font-family:Inter;font-size:12px;color:#555;">{c}</span></div>'
                 for n, c in d["swatches"])
    if d["style"] == "halftone":
        motif = halftone_photo(660, 150, d["primary"], 3, 8)
    elif d["style"] == "contour":
        motif = f'<div style="background:{d["bg"]};border-radius:8px;overflow:hidden;">{contour_bg(660, 150, d["mint"], 8, 2.0)}</div>'
    else:
        motif = (f'<div style="height:150px;border-radius:24px;{page_bg(d, 660, 150)}display:flex;align-items:center;justify-content:center;gap:16px;">'
                 f'<div style="{GLASS}border-radius:20px;width:180px;height:96px;"></div><div style="{GLASS}border-radius:999px;width:220px;height:56px;"></div></div>')
    specimen_bg = d["bg"] if d["style"] != "glass" else "#0E3B2E"
    ink = d["ink"] if d["style"] != "glass" else "#FFFFFF"
    return f'''
<div class="screen" style="width:760px;background:#FFFFFF;padding:40px;display:flex;flex-direction:column;gap:24px;">
  <div style="display:flex;flex-direction:column;gap:10px;">
    <div style="font-family:Inter;font-weight:700;font-size:30px;color:#1A1A1A;">{d["name"]}</div>
    <div style="font-family:Inter;font-size:16px;line-height:1.5;color:#444;">{d["mood"]}</div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;">{sw}</div>
  <div style="display:flex;flex-direction:column;gap:8px;"><span style="font-family:Inter;font-size:13px;font-weight:600;color:#555;">Motif</span>{motif}</div>
  <div style="display:flex;flex-direction:column;gap:6px;padding:24px;background:{specimen_bg};border-radius:8px;">
    <span style="font-family:Inter;font-size:13px;font-weight:600;color:{d["muted"] if d["style"] != "glass" else "#CFE6D8"};">Titres : {d["head"]} · Texte : {d["body"]} · Détails : {d["mono"]}</span>
    <div style="font-family:{d["hq"]};font-weight:{d["hw"]};font-size:42px;line-height:1.05;color:{ink};{"text-transform:uppercase;" if d["style"] == "halftone" else ""}">Chêne pédonculé</div>
    <div style="font-family:{d["mq"]};font-size:15px;color:{d["muted"] if d["style"] != "glass" else "#CFE6D8"};">Quercus robur · Fagacées</div>
    <div style="font-family:{d["bq"]};font-size:17px;line-height:1.55;color:{ink};">Sais-tu que ce chêne peut vivre plus de 1 000 ans ? Ses glands nourrissent les geais, les écureuils et les sangliers.</div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;padding:16px;background:{d["bg"] if d["style"] != "glass" else "#14563F"};border-radius:8px;">{badge("CR", d, 13)}{badge("EN", d, 13)}{badge("VU", d, 13)}{badge("NT", d, 13)}</div>
  <div style="display:flex;gap:14px;padding:20px;{page_bg(d, 680, 100) if d["style"] == "glass" else "background:" + d["bg"] + ";"}border-radius:8px;">{btn("Autour de moi", "pin", d, "primary")}{btn("Identifier une plante", "camera", d, "secondary")}</div>
</div>'''

def q(f):
    return "'" + f + "'"

DIRS = [
 dict(style="halftone", name="D — Halftone",
  mood="L'esprit d'une affiche imprimée en risographie : trames de points, encre noire, deux couleurs franches et des ombres dures. Graphique, audacieux, et très mémorable.",
  bg="#F1ECE1", ink="#141414", muted="#4A4A44", primary="#12A35E", accent="#FF5B2E", logo="#141414",
  head="Archivo", hw=900, hls="-0.01em", body="Archivo", mono="DM Mono", mapfont="'DM Mono'", mapfs=13, mapls="1", maplabel="#141414",
  cont={"north_america":"#12A35E","south_america":"#12A35E","europe":"#FF5B2E","africa":"#12A35E","asia":"#12A35E","oceania":"#12A35E","antarctica":"#9A968C"},
  swatches=[("Papier","#F1ECE1"),("Encre","#141414"),("Texte secondaire","#4A4A44"),("Vert risographie","#12A35E"),("Orange fluo","#FF5B2E"),("Blanc","#FFFFFF")]),
 dict(style="contour", name="E — Courbes de niveau",
  mood="Une carte topographique de nuit : courbes de niveau, vert forêt profond, crème et ambre. Le côté exploration et terrain, avec des coordonnées et des détails en police technique.",
  bg="#0F2A21", surface="#163A2E", ink="#F1EBDD", muted="#B9C7BC", primary="#F2B85B", accent="#F2B85B", mint="#7FC8A0", logo="#7FC8A0",
  line="#2F5C4A", line2="#4F8A6B", land="#1A4434", coast="#C9DCC9",
  head="Space Grotesk", hw=700, hls="-0.01em", body="IBM Plex Sans", mono="IBM Plex Mono", mapfont="'IBM Plex Mono'", mapfs=12, mapls="1.5", maplabel="#F1EBDD",
  swatches=[("Forêt de nuit","#0F2A21"),("Surface","#163A2E"),("Crème","#F1EBDD"),("Texte secondaire","#B9C7BC"),("Ambre","#F2B85B"),("Menthe","#7FC8A0")]),
 dict(style="glass", name="F — Liquid glass",
  mood="Des panneaux de verre posés sur une nature lumineuse et floue : profondeur, reflets et transparence. Doux, moderne et immersif, comme une vitre sur la forêt.",
  bg="#14563F", ink="#0B1F17", muted="#2E4A3D", primary="#0B5C43", accent="#F5D76E", logo="#FFFFFF",
  head="Plus Jakarta Sans", hw=800, hls="-0.01em", body="Plus Jakarta Sans", mono="Plus Jakarta Sans", mapfont="'Plus Jakarta Sans'", mapfs=15, mapls="0", maplabel="#0B1F17",
  cont={"north_america":"#EAF6EE","south_america":"#DDF0E3","europe":"#FFF3C4","africa":"#F3E7C8","asia":"#E3F2EA","oceania":"#FDE8B8","antarctica":"#FFFFFF"},
  swatches=[("Forêt","#0E3B2E"),("Mousse","#3FA36F"),("Lagon","#2C8C99"),("Soleil","#F5D76E"),("Encre","#0B1F17"),("Verre","#FFFFFF (23 %)")]),
]
for d in DIRS:
    d["hq"], d["bq"], d["mq"] = q(d["head"]), q(d["body"]), q(d["mono"])
DIRS[2]["swatches"][-1] = ("Verre (blanc 23 %)", "#FFFFFF")

html = ['<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Nomen Nature — directions D E F</title>',
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#E9E9E9;padding:40px;display:flex;flex-direction:column;gap:80px;width:max-content}'
        '.row{display:flex;gap:60px;align-items:flex-start}.screen{flex-shrink:0}</style></head><body>']
for d in DIRS:
    html.append(f'<div class="row">{tile(d)}{mobile(d)}{desktop(d)}</div>')
html.append('</body></html>')
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "directions_def.html")
with open(out, "w", encoding="utf-8") as f:
    f.write("".join(html))
print(out, os.path.getsize(out))
