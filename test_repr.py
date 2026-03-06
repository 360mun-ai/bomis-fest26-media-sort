import json
data = json.load(open("credentials.json"))
print(repr(data["private_key"]))
