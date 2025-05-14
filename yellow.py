from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import os
from werkzeug.utils import secure_filename
import io

app = Flask(__name__)

# Enabling CORS for your specific frontend domain
CORS(app, resources={r"/process": {"origins": "https://www.theredactedunit.com"}})

# Directory to temporarily save files (you can also change this to persistent storage)
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Config for yellow and black transformation
threshold = 128  # Adjust as needed
yellow = (255, 242, 0)  # RGB for #FFF200
black = (0, 0, 0)

# Function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return "Welcome to Yellow API!"

@app.route('/process', methods=['POST'])
def process_image():
    try:
        # Check if a file is part of the request
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']

        # If no file is selected
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Check if the file has an allowed extension
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            # Process the image to yellow and black
            image = Image.open(file_path)
            yellow_black_image = apply_yellow_black_transform(image)

            # Save the modified image to a byte stream (to send back to the user)
            img_byte_arr = io.BytesIO()
            yellow_black_image.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)

            # Return the processed image as a response
            return send_file(img_byte_arr, mimetype='image/png', as_attachment=True, download_name='yellow_black_image.png')

        else:
            return jsonify({"error": "File type not allowed"}), 400

    except Exception as e:
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

@app.route('/download/<filename>')
def download_file(filename):
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True)
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
