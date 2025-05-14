from flask import Flask, request, jsonify, send_file
from flask_cors import CORS  # Importing CORS from flask_cors

app = Flask(__name__)

# Enabling CORS for your specific frontend domain
CORS(app, resources={r"/process": {"origins": "https://www.theredactedunit.com"}})

@app.route('/')
def index():
    return "Welcome to Yellow API!"

@app.route('/process', methods=['POST'])
def process_image():
    try:
        # Get data from request
        data = request.json
        print(f"Received data: {data}")

        # Example logic: just return a success message for now
        # Add your image processing logic here (if needed)
        if 'key' in data:
            return jsonify({"message": "Image processed successfully."}), 200
        else:
            return jsonify({"error": "Missing 'key' in request data."}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download')
def download_file():
    try:
        # Specify file path
        file_path = "path/to/your/file.png"  # Update this path to actual file
        return send_file(file_path, as_attachment=True)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Running on Render with correct port and host setup
    app.run(debug=True, host='0.0.0.0', port=5000)
