"""
Open Minds Fest Media Sorter — Local Python Worker
===================================================
This script polls the Unsorted_Media folder on Google Drive, downloads new images,
runs face detection/recognition, and routes them into auto-created kid_N folders.

Usage:
  1. Place your Google Cloud Service Account credentials.json in this directory.
  2. Fill in the FOLDER_ID constants below.
  3. pip install google-api-python-client google-auth face_recognition Pillow numpy
  4. python sorter.py
"""

import os
import time
import json
import pickle
import numpy as np
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
import face_recognition
from PIL import Image
import io

# ==========================================
# CONFIGURATION & AUTHENTICATION
# ==========================================
SERVICE_ACCOUNT_FILE = 'credentials.json'
SCOPES = ['https://www.googleapis.com/auth/drive']

try:
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    drive_service = build('drive', 'v3', credentials=creds)
except Exception as e:
    print(f"[FATAL] Could not initialize Google Drive API: {e}")
    drive_service = None

# ---- Google Drive Folder IDs (Fill these in) ----
UNSORTED_FOLDER_ID = ""
GROUP_PHOTOS_FOLDER_ID = ""
STUDENTS_ROOT_FOLDER_ID = ""

# ---- Local paths ----
TEMP_DIR = "temp_processing"
REFERENCE_DIR = ".system/reference_faces"
REGISTRY_FILE = ".system/face_registry.json"
PROCESSED_LOG = ".system/processed_files.json"

# ---- Tuning ----
POLL_INTERVAL = 10          # seconds between polls
FACE_TOLERANCE = 0.5        # lower = stricter matching (default 0.6)
GROUP_PHOTO_THRESHOLD = 3   # faces > this count → group photo

# ==========================================
# REGISTRY MANAGEMENT
# ==========================================
def load_registry():
    """Load the face registry: { "kid_1": { "drive_folder_id": "...", "named": false, "display_name": "kid_1" }, ... }"""
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_registry(registry):
    with open(REGISTRY_FILE, 'w') as f:
        json.dump(registry, f, indent=2)

def load_processed():
    """Track which Drive file IDs have already been processed."""
    if os.path.exists(PROCESSED_LOG):
        with open(PROCESSED_LOG, 'r') as f:
            return set(json.load(f))
    return set()

def save_processed(processed_set):
    with open(PROCESSED_LOG, 'w') as f:
        json.dump(list(processed_set), f)

def get_next_kid_id(registry):
    """Returns the next available kid_N id."""
    existing_ids = [k for k in registry.keys() if k.startswith("kid_")]
    if not existing_ids:
        return "kid_1"
    nums = []
    for kid_id in existing_ids:
        try:
            nums.append(int(kid_id.split("_")[1]))
        except (IndexError, ValueError):
            pass
    return f"kid_{max(nums) + 1}" if nums else "kid_1"

# ==========================================
# FACE ENCODING STORAGE
# ==========================================
ENCODINGS_FILE = ".system/face_encodings.pkl"

def load_encodings():
    """Load all known face encodings: list of (kid_id, encoding)."""
    if os.path.exists(ENCODINGS_FILE):
        with open(ENCODINGS_FILE, 'rb') as f:
            return pickle.load(f)
    return []

def save_encodings(encodings_list):
    with open(ENCODINGS_FILE, 'wb') as f:
        pickle.dump(encodings_list, f)

def add_encoding(encodings_list, kid_id, encoding):
    encodings_list.append((kid_id, encoding))
    save_encodings(encodings_list)

# ==========================================
# RATE LIMITER (Token Bucket)
# ==========================================
class RateLimiter:
    """
    Token-bucket rate limiter for Google Drive API.
    Google allows ~3 sustained writes/sec.
    We use 2.5/sec to leave headroom.
    """
    def __init__(self, rate=2.5, burst=3):
        self.rate = rate        # tokens per second
        self.burst = burst      # max tokens
        self.tokens = burst     # start full
        self.last_time = time.monotonic()
        self.total_calls = 0
        self.total_waits = 0.0

    def acquire(self):
        """Block until a token is available, then consume it."""
        now = time.monotonic()
        elapsed = now - self.last_time
        self.last_time = now

        # Refill tokens
        self.tokens = min(self.burst, self.tokens + elapsed * self.rate)

        if self.tokens < 1:
            # Must wait for a token to refill
            wait_time = (1 - self.tokens) / self.rate
            self.total_waits += wait_time
            time.sleep(wait_time)
            self.tokens = 0
        else:
            self.tokens -= 1

        self.total_calls += 1

    def stats(self):
        return f"{self.total_calls} API calls, {self.total_waits:.1f}s total throttle wait"


# Global rate limiter instance
limiter = RateLimiter(rate=2.5, burst=3)

# ==========================================
# GOOGLE DRIVE HELPERS (Rate-Limited)
# ==========================================
def api_call(fn, *args, **kwargs):
    """Wrapper that rate-limits every Drive API call."""
    limiter.acquire()
    return fn(*args, **kwargs).execute()

def download_file(file_id, dest_path):
    """Downloads a file from Google Drive to a local path."""
    limiter.acquire()
    request = drive_service.files().get_media(fileId=file_id)
    fh = io.FileIO(dest_path, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    fh.close()

def copy_file_to_folder(file_id, dest_folder_id):
    """Copies a Drive file into a destination folder."""
    api_call(drive_service.files().copy,
             fileId=file_id,
             body={'parents': [dest_folder_id]})

def create_drive_folder(name, parent_id):
    """Creates a subfolder in Google Drive and returns its ID."""
    metadata = {
        'name': name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }
    folder = api_call(drive_service.files().create,
                      body=metadata, fields='id')
    return folder['id']

def upload_thumbnail(local_path, folder_id, filename):
    """Uploads a small thumbnail image to a Drive folder."""
    media = MediaFileUpload(local_path, mimetype='image/jpeg')
    api_call(drive_service.files().create,
             body={'name': filename, 'parents': [folder_id]},
             media_body=media, fields='id')

def list_unsorted_files():
    """Lists all files in the Unsorted_Media folder."""
    results = api_call(drive_service.files().list,
                       q=f"'{UNSORTED_FOLDER_ID}' in parents and trashed = false and mimeType contains 'image/'",
                       fields="files(id, name, mimeType)",
                       pageSize=100)
    return results.get('files', [])

# ==========================================
# QUEUE.JSON MANAGEMENT
# ==========================================
QUEUE_FILE = "queue.json"

def read_queue():
    """Read pending events from queue.json (written by the Next.js webhook)."""
    if not os.path.exists(QUEUE_FILE):
        return []
    try:
        with open(QUEUE_FILE, 'r') as f:
            data = f.read().strip()
            return json.loads(data) if data else []
    except (json.JSONDecodeError, IOError):
        return []

def clear_queue():
    """Reset queue.json to empty after processing."""
    with open(QUEUE_FILE, 'w') as f:
        json.dump([], f)

def has_pending_events():
    """Check if the webhook has logged any new events since last clear."""
    events = read_queue()
    return len(events) > 0

# ==========================================
# FACE PROCESSING CORE
# ==========================================
def crop_face(image_array, face_location, output_path, size=(200, 200)):
    """Crops a face from an image and saves it as a thumbnail."""
    top, right, bottom, left = face_location
    # Add some padding
    height, width = image_array.shape[:2]
    pad = int((bottom - top) * 0.3)
    top = max(0, top - pad)
    bottom = min(height, bottom + pad)
    left = max(0, left - pad)
    right = min(width, right + pad)

    face_crop = image_array[top:bottom, left:right]
    pil_image = Image.fromarray(face_crop)
    pil_image = pil_image.resize(size, Image.LANCZOS)
    pil_image.save(output_path, "JPEG", quality=85)

def find_match(encoding, known_encodings, tolerance=FACE_TOLERANCE):
    """Finds the best match for a face encoding. Returns kid_id or None."""
    if not known_encodings:
        return None

    known_ids = [k[0] for k in known_encodings]
    known_encs = [k[1] for k in known_encodings]

    distances = face_recognition.face_distance(known_encs, encoding)
    best_idx = np.argmin(distances)

    if distances[best_idx] <= tolerance:
        return known_ids[best_idx]
    return None

def register_new_kid(registry, known_encodings, encoding, face_image, face_location):
    """
    Registers a new unrecognized face:
    1. Assigns kid_N label
    2. Creates Drive folder
    3. Saves face crop as reference
    4. Saves encoding
    Returns the kid_id and drive_folder_id.
    """
    kid_id = get_next_kid_id(registry)

    # Create Drive folder (rate-limited)
    folder_id = create_drive_folder(kid_id, STUDENTS_ROOT_FOLDER_ID)

    # Save face crop locally as reference
    ref_path = os.path.join(REFERENCE_DIR, f"{kid_id}.jpg")
    crop_face(face_image, face_location, ref_path)

    # Upload reference thumbnail to Drive folder too (rate-limited)
    upload_thumbnail(ref_path, folder_id, f"_reference_{kid_id}.jpg")

    # Update registry
    registry[kid_id] = {
        "drive_folder_id": folder_id,
        "named": False,
        "display_name": kid_id,
        "photo_count": 0
    }
    save_registry(registry)

    # Save encoding
    add_encoding(known_encodings, kid_id, encoding)

    print(f"  [NEW] Registered {kid_id} → Drive folder {folder_id}")
    return kid_id, folder_id

def process_image(file_id, filename, registry, known_encodings):
    """
    Downloads an image, detects faces, and routes accordingly.
    Every Drive API call goes through the rate limiter.
    """
    temp_path = os.path.join(TEMP_DIR, filename)

    try:
        # 1. Download (rate-limited)
        print(f"  Downloading {filename}...")
        download_file(file_id, temp_path)

        # 2. Detect faces (local CPU, no API call)
        image = face_recognition.load_image_file(temp_path)
        face_locations = face_recognition.face_locations(image)
        num_faces = len(face_locations)
        print(f"  Detected {num_faces} face(s).")

        if num_faces == 0:
            print("  → No faces. Skipping.")
            return []

        # 3. Group photo check (rate-limited copy)
        if num_faces > GROUP_PHOTO_THRESHOLD:
            copy_file_to_folder(file_id, GROUP_PHOTOS_FOLDER_ID)
            print(f"  → Copied to Group Photos (>{GROUP_PHOTO_THRESHOLD} faces)")

        # 4. Process each face
        face_encodings = face_recognition.face_encodings(image, face_locations)
        matched_kids = []

        for i, (encoding, location) in enumerate(zip(face_encodings, face_locations)):
            kid_id = find_match(encoding, known_encodings)

            if kid_id is None:
                # New face → register as kid_N (multiple rate-limited calls inside)
                kid_id, folder_id = register_new_kid(
                    registry, known_encodings, encoding, image, location)
            else:
                folder_id = registry[kid_id]["drive_folder_id"]
                print(f"  → Face {i+1}: Matched {registry[kid_id]['display_name']}")

            # Copy file to kid's folder (rate-limited)
            copy_file_to_folder(file_id, folder_id)

            # Increment photo count
            registry[kid_id]["photo_count"] = registry[kid_id].get("photo_count", 0) + 1
            matched_kids.append(kid_id)

        save_registry(registry)
        return matched_kids

    except Exception as e:
        print(f"  [ERROR] Processing {filename}: {e}")
        return []
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# ==========================================
# MAIN LOOP (Hybrid: Queue.json + Drive Poll)
# ==========================================
def ensure_dirs():
    """Create required local directories."""
    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(REFERENCE_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(REGISTRY_FILE), exist_ok=True)

def main():
    ensure_dirs()

    registry = load_registry()
    known_encodings = load_encodings()
    processed = load_processed()

    print(f"[BOOT] Loaded {len(registry)} registered faces, {len(processed)} processed files.")
    print(f"[BOOT] Rate limiter: {limiter.rate} req/s, burst {limiter.burst}")
    print(f"[BOOT] Face tolerance: {FACE_TOLERANCE}, Group threshold: >{GROUP_PHOTO_THRESHOLD}")
    print(f"[BOOT] Polling every {POLL_INTERVAL}s (immediate on queue.json signal)")
    print()

    while True:
        try:
            # ---- Step 1: Check queue.json for webhook signals ----
            triggered_by_queue = has_pending_events()
            if triggered_by_queue:
                events = read_queue()
                print(f"[QUEUE] Received {len(events)} webhook event(s). Waking up to process.")
                clear_queue()
            
            # ---- Step 2: List all unsorted files from Drive (rate-limited) ----
            unsorted = list_unsorted_files()
            new_files = [f for f in unsorted if f['id'] not in processed]

            if new_files:
                print(f"[POLL] Found {len(new_files)} new file(s) to process.")

                for file_info in new_files:
                    file_id = file_info['id']
                    filename = file_info['name']

                    print(f"\n[PROCESS] {filename}")
                    process_image(file_id, filename, registry, known_encodings)

                    processed.add(file_id)
                    save_processed(processed)

                print(f"\n[DONE] Batch complete. {len(registry)} total kids registered.")
                print(f"[STATS] {limiter.stats()}\n")

            elif triggered_by_queue:
                print("[QUEUE] Webhook fired but no new unprocessed files found.\n")

        except Exception as e:
            print(f"[ERROR] Poll cycle failed: {e}")

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    if not drive_service:
        print("[FATAL] Cannot start without Google Drive API. Check credentials.json.")
    elif not UNSORTED_FOLDER_ID or not STUDENTS_ROOT_FOLDER_ID:
        print("[FATAL] UNSORTED_FOLDER_ID and STUDENTS_ROOT_FOLDER_ID must be set.")
    else:
        main()

