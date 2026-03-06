"""
Open Minds Fest Media Sorter — Local Python Worker
===================================================
This script polls the Unsorted_Media folder on Google Drive, downloads new images,
runs face detection/recognition, and routes them into auto-created kid_N folders.

Usage:
  1. Place your Google Cloud Service Account credentials.json in this directory.
  2. Fill in the FOLDER_ID constants in .env.local or hardcode them below. 
  3. pip install google-api-python-client google-auth opencv-python Pillow numpy
  4. python sorter.py
"""

import os
import time
import json
import pickle
import numpy as np
import urllib.request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
import cv2
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
UNSORTED_FOLDER_ID = "1Ng1nlFfLo2H4d_hgs7UnQlHHL9uGm2j8"
GROUP_PHOTOS_FOLDER_ID = ""  # You can fill this if you want a specific group photo folder
STUDENTS_ROOT_FOLDER_ID = "11v90B92T7lVdl0ijhMbXayqkX04VUpAV"

# ---- Local paths ----
TEMP_DIR = "temp_processing"
REFERENCE_DIR = ".system/reference_faces"
REGISTRY_FILE = ".system/face_registry.json"
PROCESSED_LOG = ".system/processed_files.json"
MODELS_DIR = ".system/models"

# ---- Tuning ----
POLL_INTERVAL = 10          # seconds between polls
GROUP_PHOTO_THRESHOLD = 3   # faces > this count → group photo
FACE_SIMILARITY_THRESHOLD = 0.363  # Cosine similarity threshold for SFace (higher means stricter match)

# ==========================================
# MODEL DOWNLOADER
# ==========================================
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

def download_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    if not os.path.exists(YUNET_PATH):
        print(f"[MODEL] Downloading YuNet face detection model...")
        urllib.request.urlretrieve(YUNET_URL, YUNET_PATH)
    if not os.path.exists(SFACE_PATH):
        print(f"[MODEL] Downloading SFace face recognition model...")
        urllib.request.urlretrieve(SFACE_URL, SFACE_PATH)

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


# Initialize globals for OpenCV detectors (populated in main)
detector = None
recognizer = None

# ==========================================
# FACE PROCESSING CORE
# ==========================================
def process_face(image, face, known_encodings, registry):
    """Extracts features, compares to known faces, registers if new."""
    global recognizer
    
    # Align and crop face to 112x112
    aligned_face = recognizer.alignCrop(image, face)
    
    # Extract 128D feature vector
    feature = recognizer.feature(aligned_face)

    # Convert to matching loop
    best_score = 0.0
    best_id = None

    if known_encodings:
        for kid_id, known_feature in known_encodings:
            score = recognizer.match(known_feature, feature, cv2.FaceRecognizerSF_FR_COSINE)
            if score > best_score:
                best_score = score
                best_id = kid_id

    # Add debug output to see similarity scores
    if best_id:
        print(f"    Raw similarity score to {best_id}: {best_score:.3f} (threshold: {FACE_SIMILARITY_THRESHOLD})")

    if best_id and best_score >= FACE_SIMILARITY_THRESHOLD:
        return best_id, None, None # Matched! Return kid_id
    else:
        # Register new kid
        kid_id = get_next_kid_id(registry)
        
        # Save reference image
        ref_path = os.path.join(REFERENCE_DIR, f"{kid_id}.jpg")
        cv2.imwrite(ref_path, aligned_face)
        
        # Create drive folder
        folder_id = create_drive_folder(kid_id, STUDENTS_ROOT_FOLDER_ID)
        
        # Upload thumbnail
        upload_thumbnail(ref_path, folder_id, f"_reference_{kid_id}.jpg")

        registry[kid_id] = {
            "drive_folder_id": folder_id,
            "named": False,
            "display_name": kid_id,
            "photo_count": 0
        }
        
        add_encoding(known_encodings, kid_id, feature)
        print(f"  [NEW] Registered {kid_id} → Drive folder {folder_id}")
        return kid_id, folder_id, feature


def process_image(file_id, filename, registry, known_encodings):
    """
    Downloads an image, detects faces, and routes accordingly.
    Every Drive API call goes through the rate limiter.
    """
    global detector
    temp_path = os.path.join(TEMP_DIR, filename)

    try:
        # 1. Download (rate-limited)
        print(f"  Downloading {filename}...")
        download_file(file_id, temp_path)

        # 2. Load image with OpenCV
        image = cv2.imread(temp_path)
        if image is None:
            print("  [ERROR] OpenCV could not read image.")
            return []

        h, w, _ = image.shape
        detector.setInputSize((w, h))

        # 3. Detect faces
        _, faces = detector.detect(image)
        faces = faces if faces is not None else []
        num_faces = len(faces)
        print(f"  Detected {num_faces} face(s).")

        if num_faces == 0:
            print("  → No faces. Skipping.")
            return []

        # 4. Group photo check (rate-limited copy)
        if num_faces > GROUP_PHOTO_THRESHOLD and GROUP_PHOTOS_FOLDER_ID:
            copy_file_to_folder(file_id, GROUP_PHOTOS_FOLDER_ID)
            print(f"  → Copied to Group Photos (>{GROUP_PHOTO_THRESHOLD} faces)")

        # 5. Process each face
        matched_kids = []
        for i, face in enumerate(faces):
            kid_id, folder_id, new_feature = process_face(image, face, known_encodings, registry)
            if folder_id is None: # It was a match
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
        import traceback
        traceback.print_exc()
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

def initialize_models():
    """Download and initialize ONNX models."""
    global detector, recognizer
    download_models()
    
    detector = cv2.FaceDetectorYN.create(
        YUNET_PATH, "", (320, 320),
        score_threshold=0.8,
        nms_threshold=0.3,
        top_k=5000
    )
    recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")

def main():
    ensure_dirs()
    initialize_models()

    registry = load_registry()
    known_encodings = load_encodings()
    processed = load_processed()

    print(f"[BOOT] Loaded {len(registry)} registered faces, {len(processed)} processed files.")
    print(f"[BOOT] OpenCV YuNet Face Detection + SFace Recognition Models Initialized.")
    print(f"[BOOT] Rate limiter: {limiter.rate} req/s, burst {limiter.burst}")
    print(f"[BOOT] Cosine Similarity threshold: {FACE_SIMILARITY_THRESHOLD}, Group threshold: >{GROUP_PHOTO_THRESHOLD}")
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
