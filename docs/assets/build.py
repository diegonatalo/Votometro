"""Gera os SVGs de docs/assets e o README.md a partir de theme.json e content.json.

Uso: python docs/assets/build.py
"""
import base64, io, json, pathlib, textwrap
from xml.sax.saxutils import escape
from PIL import Image

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
THEMES = json.loads((HERE / "theme.json").read_text(encoding="utf-8"))
C = json.loads((HERE / "content.json").read_text(encoding="utf-8"))


def esc(s):
    return escape(s, {'"': "&quot;"})


def svg(w, h, t, title, body, defs="", style=""):
    st = f"<style>{style}</style>" if style and t["animations"] else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'role="img" aria-label="{esc(title)}"><title>{esc(title)}</title>{st}<defs>{defs}</defs>{body}</svg>\n')


def grad(t):
    return (f'<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{t["accent"]}"/>'
            f'<stop offset="1" stop-color="{t["accent2"]}"/></linearGradient>')


def glow(gid, cx, cy, r, color, op):
    return (f'<radialGradient id="{gid}" gradientUnits="userSpaceOnUse" cx="{cx}" cy="{cy}" r="{r}">'
            f'<stop offset="0" stop-color="{color}" stop-opacity="{op}"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient>')


def data_uri(path, max_w, max_kb=190):
    im = Image.open(ROOT / path).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    q = 82
    while True:
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
        if buf.tell() <= max_kb * 1024 or q <= 40:
            break
        q -= 6
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def window_dots(t, x, y):
    cols = ["#ff8a7a", "#f5d36a", t["accent"]]
    return "".join(f'<circle cx="{x + i * 16}" cy="{y}" r="4.5" fill="{c}"/>' for i, c in enumerate(cols))


def chip(t, x, y, label, i, fs=13):
    w = round(0.6 * fs * len(label) + 38)
    col = t["accent"] if i % 2 == 0 else t["accent2"]
    return (w, f'<rect x="{x}" y="{y}" width="{w}" height="32" rx="16" fill="{t["bg"]}" stroke="{t["borderStrong"]}"/>'
               f'<circle cx="{x + 18}" cy="{y + 16}" r="3.5" fill="{col}"/>'
               f'<text x="{x + 30}" y="{y + 21}" font-family="{t["fontMono"]}" font-size="{fs}" fill="{t["fg"]}">{esc(label)}</text>')


# ---------- peças ----------
def banner(t):
    W, H = 1200, 470
    pill_txt = f'github.com/{C["owner"]}/{C["repo"]}'.upper()
    pill_w = round(len(pill_txt) * 9.6 + 56)
    defs = (grad(t) + glow("ga", 170, 40, 330, t["accent"], 0.26) + glow("gb", 1040, 420, 380, t["accent2"], 0.26)
            + f'<clipPath id="cp"><rect width="{W}" height="{H}" rx="26"/></clipPath>'
            + '<clipPath id="cs"><path d="M770 86H1136V356a20 20 0 0 1-20 20H790a20 20 0 0 1-20-20Z"/></clipPath>'
            + f'<pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="{t["fg"]}" stroke-opacity="0.045"/></pattern>')
    b = f'<g clip-path="url(#cp)"><rect width="{W}" height="{H}" fill="{t["bg"]}"/>'
    if t["grid"]:
        b += f'<rect width="{W}" height="{H}" fill="url(#grid)"/>'
    if t["glow"]:
        b += ('<rect class="d1" x="-300" y="-300" width="1000" height="800" fill="url(#ga)"/>'
              '<rect class="d2" x="600" y="0" width="1000" height="800" fill="url(#gb)"/>')
    b += '</g>'
    b += f'<rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" rx="26" fill="none" stroke="{t["borderStrong"]}"/>'
    b += (f'<rect x="72" y="62" width="{pill_w}" height="36" rx="18" fill="{t["card"]}" stroke="{t["borderStrong"]}"/>'
          f'<circle class="dot" cx="94" cy="80" r="4.5" fill="{t["accent"]}"/>'
          f'<text x="110" y="85" font-family="{t["fontMono"]}" font-size="13" letter-spacing="1.8" fill="{t["muted"]}">{esc(pill_txt)}</text>')
    words = C["name"].split()
    if len(words) > 1:
        b += (f'<text x="72" y="196" font-family="{t["fontDisplay"]}" font-size="98" font-weight="800" letter-spacing="-3" fill="{t["fg"]}">{esc(" ".join(words[:-1]))} '
              f'<tspan fill="url(#g)">{esc(words[-1])}</tspan></text>')
    else:
        b += f'<text x="72" y="196" font-family="{t["fontDisplay"]}" font-size="98" font-weight="800" letter-spacing="-3" fill="{t["fg"]}">{esc(C["name"])}</text>'
    for i, ln in enumerate(textwrap.wrap(C["tagline"], 52)[:2]):
        b += f'<text x="72" y="{296 + 28 * i}" font-family="{t["fontSans"]}" font-size="20" fill="{t["muted"]}">{esc(ln)}</text>'
    x = 72
    for i, s in enumerate(C["stack"][:4]):
        w, g = chip(t, x, 362, s["t"], i)
        b += g
        x += w + 10
    uri = data_uri(f"docs/screenshots/principal-{t['name']}.png", 732, 120)
    b += (f'<rect x="770" y="58" width="366" height="318" rx="20" fill="{t["card"]}" stroke="{t["borderStrong"]}"/>'
          + window_dots(t, 794, 72) +
          f'<text x="843" y="76" font-family="{t["fontMono"]}" font-size="12" fill="{t["subtle"]}">{esc(C["demo_url"].split("//")[1])}</text>'
          f'<g clip-path="url(#cs)"><image href="{uri}" x="770" y="86" width="366" height="290" preserveAspectRatio="xMidYMin meet"/></g>'
          f'<line x1="770" y1="86.5" x2="1136" y2="86.5" stroke="{t["borderStrong"]}"/>'
          f'<rect x="770.5" y="58.5" width="365" height="317" rx="19.5" fill="none" stroke="{t["borderStrong"]}"/>')
    style = (".dot{animation:p 2.4s ease-in-out infinite}@keyframes p{50%{opacity:.35}}"
             ".d1{animation:a 14s ease-in-out infinite alternate}.d2{animation:a 16s ease-in-out infinite alternate-reverse}"
             "@keyframes a{to{transform:translate(40px,28px)}}")
    return svg(W, H, t, f'{C["name"]}: {C["tagline"]}', b, defs, style)


def button(t, label, primary):
    w = round(len(label + " ↗") * 9.6 + 64)
    if primary:
        b = f'<rect width="{w}" height="52" rx="26" fill="url(#g)"/>'
        col = t["onAccent"]
    else:
        b = f'<rect x="0.75" y="0.75" width="{w - 1.5}" height="50.5" rx="25.25" fill="{t["card"]}" stroke="{t["borderStrong"]}" stroke-width="1.5"/>'
        col = t["fg"]
    b += f'<text x="{w / 2}" y="32" text-anchor="middle" font-family="{t["fontSans"]}" font-size="16" font-weight="700" fill="{col}">{esc(label)} ↗</text>'
    return svg(w, 52, t, f"{label} ↗", b, grad(t))


def header(t, label, title):
    pw = round(len(label) * 9.4 + 34)
    defs = (grad(t) + glow("g1", 960, 0, 300, t["accent2"], 0.16) + glow("g2", 0, 124, 280, t["accent"], 0.14)
            + '<clipPath id="c"><rect width="1000" height="124" rx="22"/></clipPath>')
    b = (f'<g clip-path="url(#c)"><rect width="1000" height="124" fill="{t["card"]}"/><rect width="1000" height="124" fill="url(#g1)"/><rect width="1000" height="124" fill="url(#g2)"/></g>'
         f'<rect x="0.5" y="0.5" width="999" height="123" rx="21.5" fill="none" stroke="{t["borderStrong"]}"/>'
         f'<rect x="40" y="26" width="{pw}" height="28" rx="14" fill="{t["accent"]}" fill-opacity="0.10" stroke="{t["accent"]}" stroke-opacity="0.38"/>'
         f'<text x="57" y="45" font-family="{t["fontMono"]}" font-size="12" letter-spacing="1.6" fill="{t["accent"]}">{esc(label)}</text>'
         f'<text x="40" y="94" font-family="{t["fontDisplay"]}" font-size="36" font-weight="800" letter-spacing="-0.8" fill="{t["fg"]}">{esc(title)}</text>'
         '<rect x="40" y="106" width="64" height="3" rx="1.5" fill="url(#g)"/>')
    return svg(1000, 124, t, f"{label}: {title}", b, defs)


def feature_card(t, n, title, desc, w=490):
    defs = grad(t) + glow("g1", w, 0, 240, t["accent"], 0.20) + f'<clipPath id="c"><rect width="{w}" height="290" rx="22"/></clipPath>'
    b = (f'<g clip-path="url(#c)"><rect width="{w}" height="290" fill="{t["card"]}"/><rect width="{w}" height="290" fill="url(#g1)"/><rect width="{w}" height="4" fill="url(#g)"/></g>'
         f'<rect x="0.5" y="0.5" width="{w - 1}" height="289" rx="21.5" fill="none" stroke="{t["borderStrong"]}"/>'
         f'<text x="32" y="44" font-family="{t["fontMono"]}" font-size="12" letter-spacing="1.6" fill="{t["subtle"]}">FUNCIONALIDADE {n:02d}</text>'
         f'<text x="32" y="82" font-family="{t["fontDisplay"]}" font-size="28" font-weight="700" fill="{t["fg"]}">{esc(title)}</text>')
    plain = desc.replace("**", "")
    for i, ln in enumerate(textwrap.wrap(plain, 54)[:5]):
        b += f'<text x="32" y="{116 + 22 * i}" font-family="{t["fontSans"]}" font-size="14.5" fill="{t["muted"]}">{esc(ln)}</text>'
    return svg(w, 290, t, f"{title}: {plain}", b, defs)


def stack_card(t, items):
    W, x, y, rows, parts = 1000, 26, 26, 1, ""
    for i, s in enumerate(items):
        w = round(0.6 * 13 * len(s["t"]) + 38)
        if x + w > W - 26:
            x, y, rows = 26, y + 40, rows + 1
        parts += chip(t, x, y, s["t"], i)[1]
        x += w + 10
    H = 26 * 2 + 32 + 40 * (rows - 1)
    b = f'<rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" rx="20" fill="{t["card"]}" stroke="{t["borderStrong"]}"/>' + parts
    return svg(W, H, t, "Stack: " + ", ".join(s["t"] for s in items), b)


def shot(t, path, alt):
    W = 1000
    im = Image.open(ROOT / path)
    phone = im.height > im.width
    if phone:
        ih = 560
        iw = round(ih * im.width / im.height)
        ix, iy, H = (W - iw) / 2, 40, 28 + ih + 24
        uri = data_uri(path, 780, 190)
    else:
        iw, ih = W, round(W * im.height / im.width)
        ix, iy, H = 0, 28, 28 + ih
        uri = data_uri(path, 1280, 190)
    defs = glow("g1", 500, H, 520, t["accent"], 0.18) + f'<clipPath id="c"><rect width="{W}" height="{H}" rx="16"/></clipPath>'
    b = (f'<g clip-path="url(#c)"><rect width="{W}" height="{H}" fill="{t["card"]}"/><rect width="{W}" height="{H}" fill="url(#g1)"/>'
         f'<rect width="{W}" height="28" fill="{t["bg"]}"/>')
    if phone:
        b += (f'<clipPath id="cph"><rect x="{ix}" y="{iy}" width="{iw}" height="{ih}" rx="10"/></clipPath>'
              f'<image href="{uri}" x="{ix}" y="{iy}" width="{iw}" height="{ih}" clip-path="url(#cph)"/></g>'
              f'<rect x="{ix}" y="{iy}" width="{iw}" height="{ih}" rx="10" fill="none" stroke="{t["borderStrong"]}"/>')
    else:
        b += f'<image href="{uri}" x="0" y="28" width="{iw}" height="{ih}"/></g>'
    b += (window_dots(t, 20, 14) + f'<line x1="0" y1="28.5" x2="{W}" y2="28.5" stroke="{t["borderStrong"]}"/>'
          f'<rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" rx="15.5" fill="none" stroke="{t["borderStrong"]}"/>')
    return svg(W, H, t, alt, b, defs)


def footer(t):
    b = ('<rect x="0" y="14" width="1000" height="2" fill="url(#g)" fill-opacity="0.7"/>'
         f'<text x="500" y="52" text-anchor="middle" font-family="{t["fontMono"]}" font-size="12.5" letter-spacing="1.2" fill="{t["subtle"]}">© {C["year"]} DIEGO NATALO</text>')
    return svg(1000, 90, t, f'© {C["year"]} Diego Natalo', b, grad(t))


# ---------- saída ----------
def write(name, builder):
    for tn, t in THEMES.items():
        (HERE / f"{name}-{tn}.svg").write_text(builder(dict(t, name=tn)), encoding="utf-8")


def pic(name, alt, attrs='width="100%"'):
    return (f'<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/{name}-dark.svg" />\n'
            f'  <img src="docs/assets/{name}-light.svg" alt="{esc(alt)}" {attrs} />\n</picture>')


def centered(*blocks):
    return '<div align="center">\n\n' + "\n\n".join(blocks) + "\n\n</div>\n"


def main():
    out, sec_n = [], [0]

    def section(label, title):
        sec_n[0] += 1
        lab = f"{sec_n[0]:02d} · {label}"
        n = "h-" + label.lower().replace(" ", "-")
        write(n, lambda t: header(t, lab, title))
        return centered(pic(n, f"{lab}: {title}"))

    def link(n, alt, url):
        return f'<a href="{url}">' + pic(n, alt, 'height="46"') + "</a>"

    write("banner", banner)
    write("btn-demo", lambda t: button(t, "Demonstração", True))
    write("btn-codigo", lambda t: button(t, "Código", False))
    out.append(centered(
        pic("banner", f'{C["name"]}: {C["tagline"]}'),
        link("btn-demo", "Demonstração ↗", C["demo_url"]) + "&nbsp;&nbsp;" + link("btn-codigo", "Código ↗", C["code_url"]),
        C["badge_lines"][0] + "\n\n" + "\n".join(C["badge_lines"][1:]),
    ))
    out.append(section("SOBRE", "Sobre o projeto"))
    out.append(C["about_md"] + "\n")

    out.append(section("DEMO", "Telas"))
    demo = C["demo"]
    for tn, t in THEMES.items():
        (HERE / f"shot-principal-{tn}.svg").write_text(shot(dict(t, name=tn), f"docs/screenshots/principal-{tn}.png", demo["main_alt"]), encoding="utf-8")
    blocks = [pic("shot-principal", demo["main_alt"]), f'<sub>{demo["main_caption"]}</sub>']
    for i, s in enumerate(demo["shots"], 1):
        n = f"shot-{i:02d}"
        write(n, lambda t, s=s: shot(t, s["src"], s["alt"]))
        blocks += [pic(n, s["alt"]), f'<sub>{s["caption"]}</sub>']
    out.append(centered(*blocks))

    out.append(section("FUNCIONALIDADES", "O que dá para fazer"))
    rows = []
    for i, f in enumerate(C["features"], 1):
        n = f"f-{i:02d}"
        write(n, lambda t, i=i, f=f: feature_card(t, i, f["title"], f["desc"]))
        rows.append(pic(n, f'{f["title"]}: {f["desc"].replace("**", "")}', 'width="49%"'))
    pairs = ["\n".join(rows[i:i + 2]) for i in range(0, len(rows), 2)]
    out.append('<div align="center">\n\n' + "\n<br />\n".join(pairs) + "\n\n</div>\n")

    out.append(section("STACK", "Stack"))
    write("stack", lambda t: stack_card(t, C["stack"]))
    out.append(centered(pic("stack", "Stack: " + ", ".join(s["t"] for s in C["stack"]))))

    out.append(section("COMO RODAR", C["run"]["title"]))
    out.append(C["run"]["md"] + "\n\n### " + C["run"]["env_title"] + "\n\n" + C["run"]["env_md"] + "\n")

    out.append(section("ESTRUTURA", C["structure"]["title"]))
    out.append(C["structure"]["md"] + "\n")

    out.append(section("MAIS", "Mais informações"))
    for m in C["more"]:
        out.append((f'### {m["title"]}\n\n' if m["title"] else "") + m["md"] + "\n")

    out.append(section("AUTOR", "Autor"))
    ab = []
    for a in C["author"]:
        n = "btn-" + a["t"].lower().replace("ó", "o")
        write(n, lambda t, a=a: button(t, a["t"], False))
        ab.append(link(n, a["t"] + " ↗", a["u"]))
    out.append(centered("&nbsp;&nbsp;".join(ab)))

    write("footer", footer)
    out.append(centered(pic("footer", f'© {C["year"]} Diego Natalo'), f'<sub>{C["closing"]}</sub>'))
    (ROOT / "README.md").write_text("\n".join(out), encoding="utf-8")


if __name__ == "__main__":
    main()
