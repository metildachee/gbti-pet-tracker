from flask import Flask, jsonify, request, send_from_directory
import json
from datetime import datetime
from collections import defaultdict
from flask_cors import CORS
from zhipuai import ZhipuAI
import os

# app = Flask(__name__)
# CORS(app, resources={r"/*": {"origins": "*"}})
app = Flask(__name__, static_folder='frontend_v2', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}})

# -----------------------
# Load data
# -----------------------
with open("data.json", "r") as f:
    DATA = json.load(f)



# -----------------------
# Helpers
# -----------------------
def parse_time(t):
    return datetime.strptime(t, "%Y-%m-%d %H:%M")


def get_pet():
    return DATA["pets"][0]  # single pet for simplicity


def compute_health(records):
    if not records:
        return "poor"

    total = sum(r.get("amount", 0) for r in records)
    avg = total / len(records)

    if avg > 50:
        return "excellent"
    elif avg > 30:
        return "good"
    elif avg > 10:
        return "fair"
    return "poor"


# -----------------------
# API: Overview
# -----------------------
@app.route("/api/overview")
def overview():
    pet = get_pet()
    records = pet["records"]

    return jsonify({
        "pet_name": f"{pet['name']} ({pet['owner']}'s Cat)",
        "health": compute_health(records),
        "total_events": len(records),
        "total_intake": sum(r.get("amount", 0) for r in records)
    })


@app.route("/api/personality")
def personality():
    with open("personality_test.json", "r") as f:
        return jsonify(json.load(f))


# -----------------------
# API: Summary
# -----------------------
@app.route("/api/summary")
def summary():
    pet = get_pet()
    records = pet["records"]

    food_items = defaultdict(int)
    total_time_spent = 0

    for r in records:
        food_items[r["item"]] += r.get("amount", 0)

    return jsonify({
        "foods": food_items,
        "total_records": len(records)
    })


# -----------------------
# API: Timeline aggregation
# -----------------------
@app.route("/api/timeline")
def timeline():
    pet = get_pet()
    records = pet["records"]

    mode = request.args.get("mode", "day")  # day/week/month/year

    buckets = defaultdict(int)

    for r in records:
        t = parse_time(r["time"])

        if mode == "day":
            key = t.strftime("%H:00")
        elif mode == "week":
            key = t.strftime("%A")  
            key = key.split("day")[0]
        elif mode == "month":
            key = t.strftime("%d")
        else:
            key = t.strftime("%Y-%m")

        buckets[key] += r.get("amount", 1)

    return jsonify({
        "mode": mode,
        "data": dict(buckets)
    })

@app.route("/api/records")
def get_records():
    """Return all pet records"""
    pet = get_pet()
    return jsonify({"records": pet["records"]})

@app.route("/video/<filename>")
def serve_video(filename):
    """Serve video files from the data directory"""
    from flask import send_file, abort
    import os
    from urllib.parse import unquote
    
    # Decode the filename (in case it's URL-encoded)
    filename = unquote(filename)
    
    # Path to your data directory
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    video_path = os.path.join(data_dir, filename)
    
    # Also handle absolute paths by extracting filename
    if not os.path.exists(video_path) and '/' in filename:
        filename = os.path.basename(filename)
        video_path = os.path.join(data_dir, filename)
    
    print(f"Looking for video: {video_path}")  # Debug
    
    if not os.path.exists(video_path):
        abort(404, description=f"Video not found: {filename}")
    
    return send_file(video_path, mimetype='video/mp4')
# -----------------------
# Serve frontend
# -----------------------
# @app.route("/")
# def home():
#     return send_from_directory(".", "frontend.html")

from flask import send_from_directory

@app.route("/personality_test.json")
def personality_test():
    return send_from_directory(
        directory=".",
        path="personality_test.json"
    )

from flask import request, jsonify
import requests

@app.route("/api/personality/analyze", methods=["POST"])
def personality_analyze():

    data = request.json
    answers = data["answers"]

    # fetch food summary
    pet = get_pet()
    records = pet["records"]

    food_items = defaultdict(int)
    total_time_spent = 0

    for r in records:
        food_items[r["item"]] += r.get("amount", 0)

    summary = jsonify({
        "foods": food_items,
        "total_records": len(records)
    })

    prompt = f"""
    You are an AI pet behavior analyst. 

    Given:

    PET QUESTIONNAIRE:
    {answers}

    FOOD SUMMARY:
    {summary}

    Return JSON:
    {{
        "type": "...",
        "description": "...",
        "confidence": 0-1
    }}
    """

    client = ZhipuAI(api_key=os.getenv("ZHIPU_API_KEY"))

    response = client.chat.completions.create(
        model="GLM-4V-Flash",
        messages=[  # ← MUST be an array
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3,
        max_tokens=500,
        response_format={"type": "json_object"}
    )
    # response = client.chat.completions.create(
    #     "https://api.glm.ai/v1/chat/completions",
    #     headers={
    #         "Authorization": "Bearer a4060ab3db7f2e385908ec593fbf0c49.7UvvZupcar5Faj8m",
    #         "Content-Type": "application/json"
    #     },
    #     json={
    #         "model": "glm-4",
    #         "messages": [
    #             {"role": "system", "content": "You are a behavioral pet psychologist."},
    #             {"role": "user", "content": prompt}
    #         ]
    #     }
    # )

    content = response.choices[0].message.content
    if isinstance(content, str):
        result_json = json.loads(content)
    else:
        result_json = content

    # CORRECT WAY - pass the dictionary as the first argument
    return jsonify(result_json)

@app.route("/")
def home():
    return send_from_directory("frontend_v2", "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5001)