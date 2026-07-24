from PIL import Image
import os

files = ['images/logos/gemini.png', 'images/logos/openai.png', 'images/logos/recraft.png', 'images/logos/sendgrid.png', 'images/logos/google-workspace.png', 'images/logos/supabase.png']

for f in files:
    full_path = os.path.join('/Users/alexandrfilippov/Desktop/AutoFlowWebProd/public', f)
    if os.path.exists(full_path):
        img = Image.open(full_path)
        img = img.convert("RGBA")
        bbox = img.getbbox()
        print(f"{f}: size={img.size}, bbox={bbox}")
