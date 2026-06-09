from flask import Flask, jsonify, request, send_from_directory
import json
from datetime import datetime
from collections import defaultdict
from flask_cors import CORS

app = Flask(__name__)
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
        "pet_name": f"{pet['name']} ({pet['owner']} pet)",
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
        elif mode == "month":
            key = t.strftime("%d")
        else:
            key = t.strftime("%Y-%m")

        buckets[key] += r.get("amount", 1)

    return jsonify({
        "mode": mode,
        "data": dict(buckets)
    })


# -----------------------
# Serve frontend
# -----------------------
# @app.route("/")
# def home():
#     return send_from_directory(".", "frontend.html")

@app.route("/")
def home():
    return send_from_directory(".", "frontend.html")


if __name__ == "__main__":
    app.run(debug=True, port=5001)