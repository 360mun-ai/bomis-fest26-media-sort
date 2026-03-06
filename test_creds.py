import traceback
from google.oauth2 import service_account

try:
    creds = service_account.Credentials.from_service_account_file('credentials.json')
    print('Success')
except Exception as e:
    traceback.print_exc()
