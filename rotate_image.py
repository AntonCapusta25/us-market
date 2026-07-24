from PIL import Image
import os

# Paths
source_path = "/Users/alexandrfilippov/Desktop/AutoFlowWebProd/images/hero-bg-dark-v2.png"
dest_path = "/Users/alexandrfilippov/Desktop/AutoFlowWebProd/images/what-we-build-bg-rotated.png"

try:
    with Image.open(source_path) as img:
        # Rotate 180 degrees
        rotated_img = img.rotate(180)
        rotated_img.save(dest_path)
        print(f"Successfully created {dest_path}")
except Exception as e:
    print(f"Error: {e}")
