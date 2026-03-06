import json
from cryptography.hazmat.primitives import serialization

data = json.load(open("credentials.json"))
try:
    key_str = data["private_key"].strip() # strip trailing \n
    key = serialization.load_pem_private_key(
        key_str.encode("utf-8"),
        password=None
    )
    print("Success loading key after stripping trailing newline.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print("FAILED", repr(e))
