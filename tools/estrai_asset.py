r"""
Estrae dall'APK originale le immagini usate dall'app e le copia in assets/images.

Le immagini vengono riconosciute dall'impronta MD5 registrata nel bundle JavaScript,
quindi funziona anche se R8 ha rinominato le risorse.

Uso (dalla cartella del progetto):
    python tools/estrai_asset.py C:\percorso\app.apk

Opzionale: con Pillow installato (pip install pillow) converte anche le icone
del launcher in icon.png / adaptive-icon.png.
"""
import hashlib
import io
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "images")

# md5 -> nome file nel progetto (dal registro asset del bundle originale)
KNOWN = {
    "a275d7c279a79e3e43eab0c7bf49f8ea": "user-logo.png",
    "252b0bf276640ac0ecdb5478f291cfc7": "lock-bg.jpg",
    "c2f231d5a2f0bc8b2d0d8b6bf5b663da": "card-texture.jpg",
}
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")


def main(apk):
    os.makedirs(OUT, exist_ok=True)
    found = {}
    icons = {}
    with zipfile.ZipFile(apk) as z:
        for info in z.infolist():
            name = info.filename
            if not name.lower().endswith(IMAGE_EXT):
                continue
            data = z.read(name)
            md5 = hashlib.md5(data).hexdigest()
            if md5 in KNOWN and md5 not in found:
                with open(os.path.join(OUT, KNOWN[md5]), "wb") as f:
                    f.write(data)
                found[md5] = name
            low = name.lower()
            for key in ("ic_launcher_foreground", "ic_launcher", "splashscreen_logo"):
                if key in low:
                    prev = icons.get(key)
                    if prev is None or len(data) > len(prev[1]):
                        icons[key] = (name, data)
                    break

    for md5, target in KNOWN.items():
        if md5 in found:
            print(f"OK   {target:<18} <- {found[md5]}")
        else:
            print(f"--   {target:<18} non trovato (resta l'immagine provvisoria)")

    try:
        from PIL import Image
    except ImportError:
        if icons:
            print("\nInstalla Pillow (pip install pillow) per estrarre anche le icone del launcher.")
        return

    mapping = {
        "ic_launcher": "icon.png",
        "ic_launcher_foreground": "adaptive-icon.png",
        "splashscreen_logo": "splash-image.png",
    }
    for key, target in mapping.items():
        if key not in icons:
            continue
        name, data = icons[key]
        try:
            im = Image.open(io.BytesIO(data)).convert("RGBA")
            if key == "ic_launcher":
                im = im.resize((1024, 1024), Image.LANCZOS)
            im.save(os.path.join(OUT, target))
            print(f"OK   {target:<18} <- {name}")
        except Exception as e:  # file XML o formato non supportato
            print(f"--   {target:<18} {name}: {e}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])
