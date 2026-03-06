import os
import json

key_str = ""
email_str = ""
with open(".env.local", "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line.startswith("GOOGLE_PRIVATE_KEY="):
            key_str = line.split("=", 1)[1]
            if key_str.startswith('"') and key_str.endswith('"'):
                key_str = key_str[1:-1]
            key_str = key_str.replace("\\n", "\n")
        elif line.startswith("GOOGLE_SERVICE_ACCOUNT_EMAIL="):
            email_str = line.split("=", 1)[1]
            if email_str.startswith('"') and email_str.endswith('"'):
                email_str = email_str[1:-1]

credentials = {
  "type": "service_account",
  "project_id": "open-minds-media-sorter",
  "private_key_id": "unknown",
  "private_key": key_str,
  "client_email": email_str,
  "client_id": "unknown",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{email_str.replace('@', '%40')}"
}

with open("credentials.json", "w") as f:
    json.dump(credentials, f, indent=2)

print("Generated credentials.json correctly via python")
