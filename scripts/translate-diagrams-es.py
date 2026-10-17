#!/usr/bin/env python3
"""Writes the Spanish step diagrams, primacura-backend/data/diagrams/es/*.svg, from
the English ones: Spanish alt text and labels (labels that would run past the
edge are shrunk). Run again after changing an English diagram:
    python3 scripts/translate-diagrams-es.py
New label text needs a Spanish entry in TXT below."""
import glob
import html
import os
import re
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "primacura-backend", "data", "diagrams"))
os.makedirs("es", exist_ok=True)
ALT={
"abdominal-thrust-spot":"Compresiones abdominales: busca el ombligo, pon el lado del pulgar de tu puño justo encima, cúbrelo con la otra mano y tira con fuerza hacia adentro y hacia arriba.",
"aed-pads-adult":"Parches del DEA en un adulto: parche 1 arriba a la derecha del pecho, debajo de la clavícula; parche 2 abajo a la izquierda, unas pulgadas debajo de la axila. Los parches no deben tocarse.",
"aed-pads-child":"Parches del DEA en un niño de 8 años o menos si los parches se tocarían: uno en el centro del pecho y otro en el centro de la espalda, entre los omóplatos.",
"aed-pads-infant":"Parches del DEA en un bebé: siempre uno en el centro del pecho y otro en el centro de la espalda, entre los omóplatos.",
"chest-thrust-spot":"Compresiones en el pecho por atragantamiento en una persona embarazada o demasiado grande para rodearla: puño en la mitad del esternón, la otra mano encima, empuja directo hacia atrás.",
"compression-depth":"Qué tan hondo presionar en la RCP: adulto al menos 2 pulgadas (5 cm), niño unas 2 pulgadas (5 cm), bebé unas 1 y media pulgadas (4 cm), a 100 a 120 compresiones por minuto.",
"epipen-site":"Dónde inyectar un autoinyector de epinefrina: la parte exterior media del muslo, entre la cadera y la rodilla. Puede ser a través de la ropa.",
"hand-position":"Posición de las manos para la RCP: talón de una mano en el centro del pecho, en la mitad inferior del esternón, con la otra mano encima.",
"infant-chest-spot":"RCP y compresiones en el pecho de un bebé: dos pulgares o dos dedos en el centro del pecho, justo debajo de la línea de los pezones.",
"tourniquet-placement":"Colocación del torniquete: 2 a 3 pulgadas por encima de la herida, del lado más cercano al corazón, nunca sobre una articulación como el codo.",
}
TXT={
"BELLY BUTTON":"OMBLIGO","IN &amp; UP":"ADENTRO Y ARRIBA","Fist just above the belly button":"Puño justo encima del ombligo",
"Cover it with your other hand, pull sharply in and up.":"Cúbrelo con la otra mano; tira fuerte hacia adentro y arriba.",
"THEIR RIGHT":"SU DERECHA","THEIR LEFT":"SU IZQUIERDA","Upper right chest, below the collarbone":"Arriba a la derecha, bajo la clavícula",
"Lower left side, below the armpit":"Abajo a la izquierda, bajo la axila","FRONT":"DELANTE","BACK":"DETRÁS",
"Middle of the chest":"Centro del pecho","Middle of the back":"Centro de la espalda",
"If the pads would touch (8 or under).":"Si los parches se tocarían (8 años o menos).",
"Always front and back for an infant.":"En un bebé, siempre delante y detrás.",
"Fist on the middle of the breastbone":"Puño en la mitad del esternón",
"Other hand over it; thrust straight back, 5 times.":"La otra mano encima; empuja hacia atrás, 5 veces.",
"For someone pregnant or too large to reach around.":"Para embarazadas o personas que no puedes rodear.",
"How deep to push":"Qué tan hondo presionar","ADULT":"ADULTO","At least":"Al menos","2 in (5 cm)":"2 pulg (5 cm)","CHILD":"NIÑO",
"About":"Unas","INFANT":"BEBÉ","1½ in (4 cm)":"1½ pulg (4 cm)",
"100–120 pushes a minute, for every age.":"100–120 compresiones por minuto, a toda edad.",
"Let the chest come all the way back up each time.":"Deja que el pecho vuelva a subir del todo cada vez.",
"KNEE":"RODILLA","HIPS":"CADERA","Outer middle of the thigh":"Parte exterior media del muslo",
"Halfway between hip and knee; through clothes is OK.":"Entre la cadera y la rodilla; sirve sobre la ropa.",
"Heel of your hand on the center of the chest":"Talón de la mano en el centro del pecho",
"Lower half of the breastbone, between the nipples.":"Mitad inferior del esternón, entre los pezones.",
"Other hand on top, fingers laced and lifted.":"La otra mano encima, dedos entrelazados y levantados.",
"NIPPLE LINE":"PEZONES","Two thumbs (or 2 fingers) side by side":"Dos pulgares (o 2 dedos) juntos",
"Center of the chest, just below the nipple line.":"Centro del pecho, justo bajo la línea de los pezones.",
"Push about 1½ in (4 cm) deep.":"Presiona unas 1½ pulg (4 cm).",
"WOUND":"HERIDA","2–3 in":"2–3 pulg","ELBOW — NOT HERE":"CODO — AQUÍ NO","TOWARD THE HEART":"HACIA EL CORAZÓN",
"Tourniquet 2–3 in above the wound":"Torniquete 2–3 pulg arriba de la herida",
"On the side nearer the heart — never on a joint.":"Del lado del corazón; nunca en una articulación.",
}
for f in sorted(glob.glob('*.svg')):
    id=f[:-4]; s=open(f).read()
    alts=re.findall(r'aria-label="[^"]*"',s)
    s=s.replace(alts[0],f'aria-label="{html.escape(ALT[id],quote=True)}"',1)
    def sub(m):
        inner=m.group(2)
        if inner in ('1','2'): return m.group(0)
        assert inner in TXT,(f,inner)
        return m.group(1)+TXT[inner]+m.group(3)
    s=re.sub(r'(<text[^>]*>)([^<]*)(</text>)',sub,s)
    open('es/'+f,'w').write(s)
    print('ok',f, max((len(v) for k,v in TXT.items() if k in open(f).read()),default=0))

# Shrink Spanish labels that would run past the picture's edge.
import html as _h
for f in sorted(glob.glob('es/*.svg')):
    s=open(f).read()
    W=float(re.search(r'viewBox="0 0 ([\d.]+)',s).group(1))
    def fit(m):
        tag,inner=m.group(1),m.group(2)
        if inner in ('1','2'): return m.group(0)
        x=float(re.search(r'\bx="([\d.]+)"',tag).group(1)); fs=float(re.search(r'font-size="([\d.]+)"',tag).group(1))
        w=float(re.search(r'font-weight="(\d+)"',tag).group(1)) if 'font-weight' in tag else 400
        est=len(_h.unescape(inner))*fs*(0.6 if w>=800 else 0.54)
        anchor=re.search(r'text-anchor="(\w+)"',tag); anchor=anchor.group(1) if anchor else 'start'
        avail = W-x-8 if anchor=='start' else (2*min(x,W-x)-8 if anchor=='middle' else x-8)
        if est<=avail: return m.group(0)
        nfs=max(8.0, round(fs*avail/est,1))
        print(f'  {f}: "{inner}" {fs}->{nfs}')
        return re.sub(r'font-size="[\d.]+"', f'font-size="{nfs}"', tag, count=1)+inner+'</text>'
    s=re.sub(r'(<text[^>]*>)([^<]*)</text>',fit,s)
    open(f,'w').write(s)
