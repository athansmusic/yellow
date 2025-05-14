from flask import Flask, request, send_file
from PIL import Image
import io

app = Flask(__name__)

@app.route('/process', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return 'No image uploaded', 400

    img_file = request.files['image']
    print(f"📷 Received: {img_file.filename}")

    try:
        img = Image.open(img_file.stream).convert("L")  # Grayscale
        yellow = (255, 242, 0)  # Hex #FFF200
        black = (0, 0, 0)
        threshold = 128

        # Create new RGB image
        result = Image.new("RGB", img.size)
        pixels = result.load()

        for y in range(img.height):
            for x in range(img.width):
                pixel = img.getpixel((x, y))
                pixels[x, y] = yellow if pixel > threshold else black

        # Save to memory buffer
        buffer = io.BytesIO()
        result.save(buffer, format="PNG")
        buffer.seek(0)

        print("✅ Successfully processed image.")
        return send_file(buffer, mimetype='image/png')

    except Exception as e:
        print(f"❌ Error: {e}")
        return 'Processing error', 500

if __name__ == '__main__':
    app.run(debug=True)
