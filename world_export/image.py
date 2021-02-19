import logging

import numpy
from PIL import Image

log = logging.getLogger()


def save_builtin(img, path):
    # having blender save was turning the image back to black!
    img.filepath = str(path).replace('.png', '-builtinsave.png')
    img.file_format = "PNG"
    img.save()
    log.info(f'wrote {path}')


def save(img, path):
    log.info(f'{path}: preparing image data')
    ar = numpy.array(img.pixels).reshape((img.size[0], img.size[1], 4))
    ar = ar[::-1, :, :]
    # if img.colorspace_settings.name == 'sRGB':
    #     ar = ar**(1 / 2.2)  # unverified
    img = Image.fromarray((ar * 255).astype(numpy.uint8))
    img.convert('RGB').save(path)
    log.info(f'{path}: saved.')
    # then use https://github.com/BinomialLLC/basis_universal
    # then bjs loads with https://doc.babylonjs.com/advanced_topics/mutliPlatTextures#basis-file-format
