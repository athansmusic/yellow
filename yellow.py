from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import io

app = Flask(__name__)

# Enable CORS for all routes or specific routes
CORS(app, resources={r"/process": {"origins": "https://www.theredactedunit.com"}})

# Define the threshold function for black and yellow conversion
def threshold_to_bw(p):
    return 255 if p > 128 else 0

@app.route('/')
def home():
    return "Welcome to the Yellow Image Processor!"

@app.route('/process', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    image_file = request.files['image']
    if not image_file:
        return jsonify({'error': 'No file uploaded'}), 400

    # Open the image
    img = Image.open(image_file)

    # Convert the image to black and yellow
    bw_img = img.point(threshold_to_bw).convert("RGB")
    
    # Change black pixels to yellow (FFF200)
    pixels = bw_img.load()
    for y in range(bw_img.height):
        for x in range(bw_img.width):
            if pixels[x, y] == (0, 0, 0):
                pixels[x, y] = (255, 242, 0)  # Yellow (FFF200)
            else:
                pixels[x, y] = (0, 0, 0)  # Black

    # Save the image to a bytes buffer
    img_byte_arr = io.BytesIO()
    bw_img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)

    return send_file(img_byte_arr, mimetype='image/png', as_attachment=True, download_name='output.png')

if __name__ == "__main__":
    app.run(debug=True)
