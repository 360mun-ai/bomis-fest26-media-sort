const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const credentials = {
    type: "service_account",
    project_id: "open-minds-media-sorter",
    private_key_id: "unknown",
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : "",
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    client_id: "unknown",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "")}`
};

fs.writeFileSync('credentials.json', JSON.stringify(credentials, null, 2));
console.log('credentials.json created successfully');
