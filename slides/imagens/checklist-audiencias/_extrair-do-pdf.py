import fitz, os, sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
doc = fitz.open(src)
for i in range(doc.page_count):
    for j, img in enumerate(doc[i].get_images(full=True)):
        xref, smask = img[0], img[1]
        pix = fitz.Pixmap(doc, xref)
        if pix.colorspace and pix.colorspace.n == 4:      # CMYK -> RGB
            pix = fitz.Pixmap(fitz.csRGB, pix)
        if smask:
            pix = fitz.Pixmap(pix, fitz.Pixmap(doc, smask))
        name = "p%02d-%d.png" % (i + 1, j + 1)
        pix.save(os.path.join(out, name))
        print(i + 1, name, pix.width, "x", pix.height, "alpha=", pix.alpha)
