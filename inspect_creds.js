const fs = require('fs');

const data = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
console.log(JSON.stringify(data.private_key));
