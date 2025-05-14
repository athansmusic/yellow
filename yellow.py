from flask import Flask, request, jsonify, send_file
from flask_cors import CORS  # Import CORS

app = Flask(__name__)

# Enable CORS for all domains, or specify a list of allowed origins
CORS(app, origins=["https://www.theredactedunit.com"])

@app.route('/')
def index():
    return "Welcome to Yellow API!"

@app.route('/process', methods=['POST'])
def process_image():
    try:
        # Example: process incoming data
        data = request.json  # Assuming you're sending JSON data
        print(f"Received data: {data}")

        # Here, you can add your image processing or any other logic
        # For this example, we just return a success message
        return jsonify({"message": "Image processed successfully."})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download')
def download_file():
    try:
        # Assuming you have a file to serve
        file_path = "path/to/your/file.png"  # Adjust this path
        return send_file(file_path, as_attachment=True)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # To run on Render, make sure to use the default port
    app.run(debug=True, host='0.0.0.0', port=5000)
