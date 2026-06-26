import zipfile
from io import BytesIO
from PIL import Image

def make_square(color):
    img = Image.new('RGB', (100, 100), color=color)
    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

zip_path = 'c:/Users/dell/Downloads/cixci-architecture-lab-main/cixci-architecture-lab-main/test_images.zip'
with zipfile.ZipFile(zip_path, 'w') as zf:
    zf.writestr('img1.png', make_square('red'))
    zf.writestr('img2.png', make_square('blue'))

print(f"ZIP file created successfully at: {zip_path}")
