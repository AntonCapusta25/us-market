from PIL import Image
import os

# Paths
source_path = "/Users/alexandrfilippov/Desktop/AutoFlowWebProd/images/hero-bg-dark-v2.png"
dest_path = "/Users/alexandrfilippov/Desktop/AutoFlowWebProd/images/what-we-build-bg-mirrored.png"

try:
    with Image.open(source_path) as img:
        # Flip vertically (Top to Bottom) - creates a true mirror of the connection edge
        flipped_img = img.transpose(Image.FLIP_TOP_BOTTOM)
        flipped_img.save(dest_path)
        print(f"Successfully created {dest_path}")
except Exception as e:
    print(f"Error: {e}")
