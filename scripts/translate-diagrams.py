#!/usr/bin/env python3
"""Writes the translated step diagrams, primacura-backend/data/diagrams/<lang>/*.svg,
from the English ones: translated alt text and labels, with labels that would run
past the picture's edge shrunk to fit. Run again after changing an English diagram:
    python3 scripts/translate-diagrams.py
New label text needs an entry for every language in LANGS below. (zh-Hant was
converted from zh-Hans with OpenCC, Hong Kong variant.)"""
import glob
import html
import os
import re
import unicodedata

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "primacura-backend", "data", "diagrams"))

LANGS = {
    'es': {
        "alt": {
            "abdominal-thrust-spot": "Compresiones abdominales: busca el ombligo, pon el lado del pulgar de tu puño justo encima, cúbrelo con la otra mano y tira con fuerza hacia adentro y hacia arriba.",
            "aed-pads-adult": "Parches del DEA en un adulto: parche 1 arriba a la derecha del pecho, debajo de la clavícula; parche 2 abajo a la izquierda, unas pulgadas debajo de la axila. Los parches no deben tocarse.",
            "aed-pads-child": "Parches del DEA en un niño de 8 años o menos si los parches se tocarían: uno en el centro del pecho y otro en el centro de la espalda, entre los omóplatos.",
            "aed-pads-infant": "Parches del DEA en un bebé: siempre uno en el centro del pecho y otro en el centro de la espalda, entre los omóplatos.",
            "chest-thrust-spot": "Compresiones en el pecho por atragantamiento en una persona embarazada o demasiado grande para rodearla: puño en la mitad del esternón, la otra mano encima, empuja directo hacia atrás.",
            "compression-depth": "Qué tan hondo presionar en la RCP: adulto al menos 2 pulgadas (5 cm), niño unas 2 pulgadas (5 cm), bebé unas 1 y media pulgadas (4 cm), a 100 a 120 compresiones por minuto.",
            "epipen-site": "Dónde inyectar un autoinyector de epinefrina: la parte exterior media del muslo, entre la cadera y la rodilla. Puede ser a través de la ropa.",
            "hand-position": "Posición de las manos para la RCP: talón de una mano en el centro del pecho, en la mitad inferior del esternón, con la otra mano encima.",
            "infant-chest-spot": "RCP y compresiones en el pecho de un bebé: dos pulgares o dos dedos en el centro del pecho, justo debajo de la línea de los pezones.",
            "tourniquet-placement": "Colocación del torniquete: 2 a 3 pulgadas por encima de la herida, del lado más cercano al corazón, nunca sobre una articulación como el codo."
        },
        "labels": {
            "BELLY BUTTON": "OMBLIGO",
            "IN &amp; UP": "ADENTRO Y ARRIBA",
            "Fist just above the belly button": "Puño justo encima del ombligo",
            "Cover it with your other hand, pull sharply in and up.": "Cúbrelo con la otra mano; tira fuerte hacia adentro y arriba.",
            "THEIR RIGHT": "SU DERECHA",
            "THEIR LEFT": "SU IZQUIERDA",
            "Upper right chest, below the collarbone": "Arriba a la derecha, bajo la clavícula",
            "Lower left side, below the armpit": "Abajo a la izquierda, bajo la axila",
            "FRONT": "DELANTE",
            "BACK": "DETRÁS",
            "Middle of the chest": "Centro del pecho",
            "Middle of the back": "Centro de la espalda",
            "If the pads would touch (8 or under).": "Si los parches se tocarían (8 años o menos).",
            "Always front and back for an infant.": "En un bebé, siempre delante y detrás.",
            "Fist on the middle of the breastbone": "Puño en la mitad del esternón",
            "Other hand over it; thrust straight back, 5 times.": "La otra mano encima; empuja hacia atrás, 5 veces.",
            "For someone pregnant or too large to reach around.": "Para embarazadas o personas que no puedes rodear.",
            "How deep to push": "Qué tan hondo presionar",
            "ADULT": "ADULTO",
            "At least": "Al menos",
            "2 in (5 cm)": "2 pulg (5 cm)",
            "CHILD": "NIÑO",
            "About": "Unas",
            "INFANT": "BEBÉ",
            "1½ in (4 cm)": "1½ pulg (4 cm)",
            "100–120 pushes a minute, for every age.": "100–120 compresiones por minuto, a toda edad.",
            "Let the chest come all the way back up each time.": "Deja que el pecho vuelva a subir del todo cada vez.",
            "KNEE": "RODILLA",
            "HIPS": "CADERA",
            "Outer middle of the thigh": "Parte exterior media del muslo",
            "Halfway between hip and knee; through clothes is OK.": "Entre la cadera y la rodilla; sirve sobre la ropa.",
            "Heel of your hand on the center of the chest": "Talón de la mano en el centro del pecho",
            "Lower half of the breastbone, between the nipples.": "Mitad inferior del esternón, entre los pezones.",
            "Other hand on top, fingers laced and lifted.": "La otra mano encima, dedos entrelazados y levantados.",
            "NIPPLE LINE": "PEZONES",
            "Two thumbs (or 2 fingers) side by side": "Dos pulgares (o 2 dedos) juntos",
            "Center of the chest, just below the nipple line.": "Centro del pecho, justo bajo la línea de los pezones.",
            "Push about 1½ in (4 cm) deep.": "Presiona unas 1½ pulg (4 cm).",
            "WOUND": "HERIDA",
            "2–3 in": "2–3 pulg",
            "ELBOW — NOT HERE": "CODO — AQUÍ NO",
            "TOWARD THE HEART": "HACIA EL CORAZÓN",
            "Tourniquet 2–3 in above the wound": "Torniquete 2–3 pulg arriba de la herida",
            "On the side nearer the heart — never on a joint.": "Del lado del corazón; nunca en una articulación."
        },
    },
    'zh-Hans': {
        "alt": {
            "abdominal-thrust-spot": "腹部冲击：找到肚脐，把拳头的拇指一侧放在肚脐正上方，用另一只手包住拳头，向内、向上用力冲击。",
            "aed-pads-adult": "成人AED电极片位置：1号贴在右上胸、锁骨下方；2号贴在左侧、腋下下方几英寸处。两片电极片不能碰在一起。",
            "aed-pads-child": "8岁或以下儿童，电极片会碰在一起时：一片贴在胸部正中，另一片贴在背部正中、两块肩胛骨之间。",
            "aed-pads-infant": "婴儿AED电极片：一定是一片贴在胸部正中，另一片贴在背部正中、两块肩胛骨之间。",
            "chest-thrust-spot": "孕妇或体型太大抱不住的人噎住时做胸部冲击：拳头放在胸骨中间，另一只手包住拳头，向后冲击。",
            "compression-depth": "心肺复苏按压深度：成人至少2英寸（5厘米），儿童约2英寸（5厘米），婴儿约1½英寸（4厘米），每分钟100到120次。",
            "epipen-site": "肾上腺素自动注射笔的注射位置：大腿外侧中部，髋部和膝盖之间。可以隔着衣服注射。",
            "hand-position": "心肺复苏的手的位置：一只手的掌根放在胸部正中、胸骨下半部，另一只手叠在上面。",
            "infant-chest-spot": "婴儿心肺复苏和胸部按压：两个拇指或两根手指放在胸部正中、乳头连线正下方。",
            "tourniquet-placement": "止血带位置：伤口上方2到3英寸、靠近心脏的一侧，绝对不要绑在肘部等关节上。"
        },
        "labels": {
            "BELLY BUTTON": "肚脐",
            "IN &amp; UP": "向内向上",
            "Fist just above the belly button": "拳头放在肚脐正上方",
            "Cover it with your other hand, pull sharply in and up.": "另一只手包住拳头，向内向上用力冲击。",
            "THEIR RIGHT": "他的右边",
            "THEIR LEFT": "他的左边",
            "Upper right chest, below the collarbone": "右上胸，锁骨下方",
            "Lower left side, below the armpit": "左侧，腋下下方",
            "FRONT": "正面",
            "BACK": "背面",
            "Middle of the chest": "胸部正中",
            "Middle of the back": "背部正中",
            "If the pads would touch (8 or under).": "电极片会碰在一起时（8岁或以下）。",
            "Always front and back for an infant.": "婴儿一定是前后贴。",
            "Fist on the middle of the breastbone": "拳头放在胸骨中间",
            "Other hand over it; thrust straight back, 5 times.": "另一只手包住拳头，向后冲击5次。",
            "For someone pregnant or too large to reach around.": "用于孕妇或体型太大抱不住的人。",
            "How deep to push": "按压深度",
            "ADULT": "成人",
            "At least": "至少",
            "2 in (5 cm)": "2英寸（5厘米）",
            "CHILD": "儿童",
            "About": "约",
            "INFANT": "婴儿",
            "1½ in (4 cm)": "1½英寸（4厘米）",
            "100–120 pushes a minute, for every age.": "所有年龄都是每分钟100–120次。",
            "Let the chest come all the way back up each time.": "每次都让胸部完全回弹。",
            "KNEE": "膝盖",
            "HIPS": "髋部",
            "Outer middle of the thigh": "大腿外侧中部",
            "Halfway between hip and knee; through clothes is OK.": "髋部和膝盖之间；可以隔着衣服。",
            "Heel of your hand on the center of the chest": "掌根放在胸部正中",
            "Lower half of the breastbone, between the nipples.": "胸骨下半部，两乳头之间。",
            "Other hand on top, fingers laced and lifted.": "另一只手叠在上面，十指相扣、手指翘起。",
            "NIPPLE LINE": "乳头连线",
            "Two thumbs (or 2 fingers) side by side": "两个拇指（或2根手指）并排",
            "Center of the chest, just below the nipple line.": "胸部正中，乳头连线正下方。",
            "Push about 1½ in (4 cm) deep.": "按下约1½英寸（4厘米）。",
            "WOUND": "伤口",
            "2–3 in": "2–3英寸",
            "ELBOW — NOT HERE": "肘部 — 不要绑这里",
            "TOWARD THE HEART": "朝向心脏",
            "Tourniquet 2–3 in above the wound": "止血带绑在伤口上方2–3英寸",
            "On the side nearer the heart — never on a joint.": "靠近心脏一侧，绝不绑在关节上。"
        },
    },
    'zh-Hant': {
        "alt": {
            "abdominal-thrust-spot": "腹部衝擊：找到肚臍，把拳頭的拇指一側放在肚臍正上方，用另一隻手包住拳頭，向內、向上用力衝擊。",
            "aed-pads-adult": "成人AED電極片位置：1號貼在右上胸、鎖骨下方；2號貼在左側、腋下下方几英寸處。兩片電極片不能碰在一起。",
            "aed-pads-child": "8歲或以下兒童，電極片會碰在一起時：一片貼在胸部正中，另一片貼在背部正中、兩塊肩胛骨之間。",
            "aed-pads-infant": "嬰兒AED電極片：一定是一片貼在胸部正中，另一片貼在背部正中、兩塊肩胛骨之間。",
            "chest-thrust-spot": "孕婦或體型太大抱不住的人噎住時做胸部衝擊：拳頭放在胸骨中間，另一隻手包住拳頭，向後衝擊。",
            "compression-depth": "心肺復甦按壓深度：成人至少2英寸（5釐米），兒童約2英寸（5釐米），嬰兒約1½英寸（4釐米），每分鐘100到120次。",
            "epipen-site": "腎上腺素自動注射筆的注射位置：大腿外側中部，髖部和膝蓋之間。可以隔着衣服注射。",
            "hand-position": "心肺復甦的手的位置：一隻手的掌根放在胸部正中、胸骨下半部，另一隻手疊在上面。",
            "infant-chest-spot": "嬰兒心肺復甦和胸部按壓：兩個拇指或兩根手指放在胸部正中、乳頭連線正下方。",
            "tourniquet-placement": "止血帶位置：傷口上方2到3英寸、靠近心臟的一側，絕對不要綁在肘部等關節上。"
        },
        "labels": {
            "BELLY BUTTON": "肚臍",
            "IN &amp; UP": "向內向上",
            "Fist just above the belly button": "拳頭放在肚臍正上方",
            "Cover it with your other hand, pull sharply in and up.": "另一隻手包住拳頭，向內向上用力衝擊。",
            "THEIR RIGHT": "他的右邊",
            "THEIR LEFT": "他的左邊",
            "Upper right chest, below the collarbone": "右上胸，鎖骨下方",
            "Lower left side, below the armpit": "左側，腋下下方",
            "FRONT": "正面",
            "BACK": "背面",
            "Middle of the chest": "胸部正中",
            "Middle of the back": "背部正中",
            "If the pads would touch (8 or under).": "電極片會碰在一起時（8歲或以下）。",
            "Always front and back for an infant.": "嬰兒一定是前後貼。",
            "Fist on the middle of the breastbone": "拳頭放在胸骨中間",
            "Other hand over it; thrust straight back, 5 times.": "另一隻手包住拳頭，向後衝擊5次。",
            "For someone pregnant or too large to reach around.": "用於孕婦或體型太大抱不住的人。",
            "How deep to push": "按壓深度",
            "ADULT": "成人",
            "At least": "至少",
            "2 in (5 cm)": "2英寸（5釐米）",
            "CHILD": "兒童",
            "About": "約",
            "INFANT": "嬰兒",
            "1½ in (4 cm)": "1½英寸（4釐米）",
            "100–120 pushes a minute, for every age.": "所有年齡都是每分鐘100–120次。",
            "Let the chest come all the way back up each time.": "每次都讓胸部完全回彈。",
            "KNEE": "膝蓋",
            "HIPS": "髖部",
            "Outer middle of the thigh": "大腿外側中部",
            "Halfway between hip and knee; through clothes is OK.": "髖部和膝蓋之間；可以隔着衣服。",
            "Heel of your hand on the center of the chest": "掌根放在胸部正中",
            "Lower half of the breastbone, between the nipples.": "胸骨下半部，兩乳頭之間。",
            "Other hand on top, fingers laced and lifted.": "另一隻手疊在上面，十指相扣、手指翹起。",
            "NIPPLE LINE": "乳頭連線",
            "Two thumbs (or 2 fingers) side by side": "兩個拇指（或2根手指）並排",
            "Center of the chest, just below the nipple line.": "胸部正中，乳頭連線正下方。",
            "Push about 1½ in (4 cm) deep.": "按下約1½英寸（4釐米）。",
            "WOUND": "傷口",
            "2–3 in": "2–3英寸",
            "ELBOW — NOT HERE": "肘部 — 不要綁這裏",
            "TOWARD THE HEART": "朝向心臟",
            "Tourniquet 2–3 in above the wound": "止血帶綁在傷口上方2–3英寸",
            "On the side nearer the heart — never on a joint.": "靠近心臟一側，絕不綁在關節上。"
        },
    },
}


def text_width(text, font_size, weight):
    """Rough width in SVG units: CJK characters are about 1 em wide, Latin about half."""
    width = 0.0
    for ch in html.unescape(text):
        if unicodedata.east_asian_width(ch) in ("W", "F"):
            width += 1.0
        else:
            width += 0.6 if weight >= 800 else 0.54
    return width * font_size


def fit(svg, path):
    view_width = float(re.search(r'viewBox="0 0 ([\d.]+)', svg).group(1))

    def shrink(m):
        tag, inner = m.group(1), m.group(2)
        if inner in ("1", "2"):
            return m.group(0)
        x = float(re.search(r'\bx="([\d.]+)"', tag).group(1))
        size = float(re.search(r'font-size="([\d.]+)"', tag).group(1))
        weight = float(re.search(r'font-weight="(\d+)"', tag).group(1)) if "font-weight" in tag else 400
        anchor = (re.search(r'text-anchor="(\w+)"', tag) or [None, "start"])[1]
        room = view_width - x - 8 if anchor == "start" else (2 * min(x, view_width - x) - 8 if anchor == "middle" else x - 8)
        need = text_width(inner, size, weight)
        if need <= room:
            return m.group(0)
        new = max(8.0, round(size * room / need, 1))
        print(f'  {path}: "{inner}" {size} -> {new}')
        return re.sub(r'font-size="[\d.]+"', f'font-size="{new}"', tag, count=1) + inner + "</text>"

    return re.sub(r"(<text[^>]*>)([^<]*)</text>", shrink, svg)


for lang, words in LANGS.items():
    os.makedirs(lang, exist_ok=True)
    for f in sorted(glob.glob("*.svg")):
        name = f[:-4]
        svg = open(f, encoding="utf-8").read()
        alt = re.search(r'aria-label="[^"]*"', svg).group(0)
        svg = svg.replace(alt, f'aria-label="{html.escape(words["alt"][name], quote=True)}"', 1)

        def label(m):
            inner = m.group(2)
            if inner in ("1", "2"):
                return m.group(0)
            if inner not in words["labels"]:
                raise SystemExit(f"{f}: no {lang} text for label {inner!r}")
            return m.group(1) + words["labels"][inner] + m.group(3)

        svg = re.sub(r"(<text[^>]*>)([^<]*)(</text>)", label, svg)
        out = os.path.join(lang, f)
        open(out, "w", encoding="utf-8").write(fit(svg, out))
    print(f"{lang}: {len(glob.glob('*.svg'))} diagrams")
