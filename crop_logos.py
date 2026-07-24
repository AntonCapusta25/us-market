from PIL import Image
import os

files = ['images/logos/gemini.png', 'images/logos/openai.png', 'images/logos/google-workspace.png']

for f in files:
    full_path = os.path.join('/Users/alexandrfilippov/Desktop/AutoFlowWebProd/public', f)
    if os.path.exists(full_path):
        img = Image.open(full_path)
        img = img.convert("RGBA")
        bbox = img.getbbox()
        if bbox:
            cropped = img.crop(bbox)
            cropped.save(full_path)
            print(f"Cropped {f} to {bbox}")
