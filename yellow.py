from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import io

app = Flask(__name__)

# Enabling CORS for your specific frontend domain
CORS(app, resources={r"/process": {"origins": "https://www.theredactedunit.com"}})

# Config for yellow and black transformation
threshold = 128  # Adjust as needed
yellow = (255, 242, 0)  # RGB for #FFF200
black = (0, 0, 0)

@app.route('/')
def index():
    return "Welcome to Yellow API!"

@app.route('/process', methods=['POST'])
def process_image():
    try:
        # Check if a file is part of the request
        if 'file' not in request.files:
            print("No file part in request")  # Debugging message
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']

        # If no file is selected
        if file.filename == '':
            print("No selected file")  # Debugging message
            return jsonify({"error": "No selected file"}), 400

        # Open the image directly from the uploaded file
        image = Image.open(file.stream)

        # Process the image to yellow and black
        yellow_black_image = apply_yellow_black_transform(image)

        # Save the modified image to a byte stream (so we can send it back directly)
        img_byte_arr = io.BytesIO()
        yellow_black_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        # Return the processed image as a response
        return send_file(img_byte_arr, mimetype='image/png', as_attachment=True, download_name='yellow_black_image.png')

    except Exception as e:
        print(f"Error occurred: {e}")  # Debugging message
        return jsonify({"error": str(e)}), 500

# Function to apply yellow and black transformation to the image
def apply_yellow_black_transform(image):
    # Convert the image to grayscale
    img = image.convert("L")
    
    # Apply threshold and map to black or yellow
    def threshold_to_bw(pixel):
        return yellow if pixel > threshold else black

    # Apply the function to each pixel
    bw_img = img.point(threshold_to_bw)

    # Convert mode to RGB before saving (so it keeps color info)
    bw_img = bw_img.convert("RGB")

    return bw_img

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
