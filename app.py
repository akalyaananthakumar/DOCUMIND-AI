import os
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from rag_pipeline import (
    index_document,
    ask_question,
    list_documents,
    clear_database,
)

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXTENSIONS = {"pdf", "txt"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file was uploaded."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Please select a file."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF and TXT files are supported."}), 400

    filename = os.path.basename(file.filename)
    save_path = os.path.join(UPLOAD_DIR, filename)
    file.save(save_path)

    try:
        result = index_document(save_path)
        return jsonify(result), 200
    except Exception as exc:
        try:
            os.remove(save_path)
        except OSError:
            pass
        return jsonify({"error": str(exc)}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    question = str(data.get("question", "")).strip()

    if not question:
        return jsonify({"error": "Please enter a question."}), 400

    try:
        result = ask_question(question)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/documents", methods=["GET"])
def documents():
    try:
        return jsonify({"documents": list_documents()}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/clear", methods=["POST"])
def clear():
    try:
        result = clear_database()
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "File is too large. Maximum size is 20 MB."}), 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
