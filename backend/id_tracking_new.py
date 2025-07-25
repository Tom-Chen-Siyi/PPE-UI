import json
import numpy as np

from collections import defaultdict

# Load annotation file
with open("annotations_view_0.json", "r") as f:
    data = json.load(f)

# Helper to compute center of bbox
def bbox_center(bbox_dict):
    xmin, ymin = bbox_dict["xmin"], bbox_dict["ymin"]
    xmax, ymax = bbox_dict["xmax"], bbox_dict["ymax"]
    return np.array([(xmin + xmax) / 2, (ymin + ymax) / 2])

# ID reassignment parameters
threshold_distance = 100
next_id = 0
id_results_updated = {}

# Previous frame object tracking
previous_ids = {}

# Process frames in order
for frame_id, frame_data in sorted(data.items(), key=lambda x: int(x[0])):
    objects = frame_data["objects"]
    current_ids = {}
    unmatched_ids = set(previous_ids.keys())
    updated_objects = []

    for obj in objects:
        bbox = obj["bbox"]
        curr_center = bbox_center(bbox)
        matched = False

        distances = [
            (pid, np.linalg.norm(curr_center - bbox_center(pbbox["bbox"])))
            for pid, pbbox in previous_ids.items()
        ]
        distances.sort(key=lambda x: x[1])

        for pid, dist in distances:
            if dist < threshold_distance and pid in unmatched_ids:
                current_ids[pid] = obj
                updated_obj = dict(obj)
                updated_obj["id"] = str(pid)
                updated_objects.append(updated_obj)
                unmatched_ids.remove(pid)
                matched = True
                break

        if not matched:
            current_ids[next_id] = obj
            updated_obj = dict(obj)
            updated_obj["id"] = str(next_id)
            updated_objects.append(updated_obj)
            next_id += 1

    previous_ids = current_ids
    id_results_updated[frame_id] = {
        "filename": frame_data["filename"],
        "objects": updated_objects
    }

# Save results
with open("annotations_view_0_reassigned_ids.json", "w") as f:
    json.dump(id_results_updated, f, indent=2)

print("ID reassignment complete.")
