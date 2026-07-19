from PIL import Image

# Create first image
img1 = Image.new('RGB', (100, 100), color = 'red')
img1.save('c:/Users/dell/Downloads/cixci-architecture-lab-main/cixci-architecture-lab-main/frontend/dummy1.png')

# Create second image
img2 = Image.new('RGB', (100, 100), color = 'blue')
img2.save('c:/Users/dell/Downloads/cixci-architecture-lab-main/cixci-architecture-lab-main/frontend/dummy2.png')

print("Created dummy1.png and dummy2.png")
