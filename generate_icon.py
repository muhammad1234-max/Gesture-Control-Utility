from PIL import Image, ImageDraw
import os

def create_icon_frame(size):
    """Creates a transparent image with a crisp geometric design for the tray icon."""
    image = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)
    
    center_x, center_y = size // 2, size // 2
    radius = int(size * 0.35)
    
    # Central 'sensor node'
    draw.ellipse(
        (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
        outline=(16, 185, 129, 255), # Emerald Green
        width=max(1, int(size * 0.08))
    )
    
    # Inner dot
    inner_radius = int(size * 0.15)
    draw.ellipse(
        (center_x - inner_radius, center_y - inner_radius, center_x + inner_radius, center_y + inner_radius),
        fill=(16, 185, 129, 255) # Emerald Green
    )
    
    # Top right 'tracking dot'
    tr_x, tr_y = center_x + int(radius * 0.8), center_y - int(radius * 0.8)
    tr_r = int(size * 0.1)
    draw.ellipse(
        (tr_x - tr_r, tr_y - tr_r, tr_x + tr_r, tr_y + tr_r),
        fill=(255, 255, 255, 255),
        outline=(0, 0, 0, 100),
        width=max(1, int(size * 0.02))
    )
    
    return image

# Order from largest to smallest. 256x256 must be the base image.
sizes = [256, 48, 32, 24, 20, 16]
images = [create_icon_frame(s) for s in sizes]

public_dir = os.path.join(os.path.dirname(__file__), 'public')
if not os.path.exists(public_dir):
    os.makedirs(public_dir)

icon_path = os.path.join(public_dir, 'tray-icon.ico')
# Base image is 256x256. append_images adds the remaining smaller sizes.
images[0].save(icon_path, format='ICO', sizes=[(s, s) for s in sizes], append_images=images[1:])

print(f"Generated multi-resolution ICO at: {icon_path}")
