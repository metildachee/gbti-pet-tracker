import csv
import json
import random
from datetime import datetime, timedelta

def convert_csv_to_json(csv_path, json_path):
    # Base date for mock timestamps (using current date as reference)
    base_date = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
    
    # Meal time ranges (breakfast: 7-9, lunch: 12-14, dinner: 18-20)
    meal_times = {
        'breakfast': (7, 9),
        'lunch': (12, 14),
        'dinner': (18, 20)
    }
    
    # Read CSV data
    with open(csv_path, 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)
    
    # Prepare JSON structure
    output = {
        "user": "Alice",
        "pets": [
            {
                "name": "Milo",
                "owner": "Alice",
                "records": []
            }
        ]
    }
    
    # Track which meals we've assigned per day to avoid duplicates
    day_counter = 0
    
    for row in rows:
        # Get food item from dense5_food, clean it up
        food_item = row.get('dense5_food', 'Unknown food')
        # Remove any extra quotes or spaces
        food_item = food_item.strip().strip('"')
        
        # Get video filename
        video_file = row.get('video', 'unknown.mp4')
        video_file = video_file.strip().strip('"')
        
        # Get risk level (High/Medium/Low/None)
        risk = row.get('dense5_risk', 'Unknown')
        risk = risk.strip().strip('"')
        
        # Get confidence level
        confidence = row.get('dense5_conf', 'Unknown')
        confidence = confidence.strip().strip('"')
        
        # Get number of API calls (for chunked method)
        n_calls = row.get('chunked_n_calls', '0')
        try:
            n_calls = int(n_calls)
        except:
            n_calls = 0
        
        # Get eating detection result
        eating = row.get('dense5_eating', 'Unknown')
        eating = eating.strip().strip('"')
        
        # Determine which meal time to assign (rotate through breakfast, lunch, dinner)
        meal_type = ['breakfast', 'lunch', 'dinner'][day_counter % 3]
        
        # Get hour range for this meal
        hour_range = meal_times[meal_type]
        hour = random.randint(hour_range[0], hour_range[1])
        minute = random.randint(0, 59)
        
        # Calculate date (go backwards in days based on index)
        days_back = day_counter // 3
        record_time = base_date - timedelta(days=days_back)
        record_time = record_time.replace(hour=hour, minute=minute)
        
        # Generate random amount (between 10 and 50 grams/units)
        amount = random.randint(10, 50)
        
        # Create record with all fields
        record = {
            "time": record_time.strftime("%Y-%m-%d %H:%M"),
            "video": video_file,
            "item": food_item,
            "amount": amount,
            "risk": risk,
            "confidence": confidence,
            "eating_detected": eating,
            # "api_calls": n_calls
        }
        
        output["pets"][0]["records"].append(record)
        day_counter += 1
    
    # Write to JSON file
    with open(json_path, 'w') as jsonfile:
        json.dump(output, jsonfile, indent=2)
    
    print(f"Successfully converted {csv_path} to {json_path}")
    print(f"Created {len(output['pets'][0]['records'])} records")
    
    # Print sample record to verify
    if output["pets"][0]["records"]:
        print("\nSample record:")
        print(json.dumps(output["pets"][0]["records"][0], indent=2))

if __name__ == "__main__":
    csv_file = "/Users/metildachee/Desktop/hci/data/test_results_v3_summary.csv"
    json_file = "/Users/metildachee/Desktop/hci/data.json"
    
    convert_csv_to_json(csv_file, json_file)