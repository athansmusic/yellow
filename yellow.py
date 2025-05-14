from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import io

# Initialize the Flask app
app = Flask(__name__)

# Apply CORS to allow requests only from the front-end domain
CORS(app, resources={r"/process": {"origins": "https://www.theredactedunit.com"}})

# Endpoint to process the uploaded image
@app.route('/process', methods=['POST'])
def process_image():
    # Ensure the request contains an image file
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image_file = request.files['image']
    
    try:
        # Open the image with Pillow
        image = Image.open(image_file.stream)

        # Process the image (Example: convert to grayscale)
        image = image.convert('L')

        # Save the processed image to a bytes buffer
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        # Send the processed image back as a response
        return send_file(img_byte_arr, mimetype='image/png')

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
