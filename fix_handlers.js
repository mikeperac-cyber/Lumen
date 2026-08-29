const fs = require('fs'); let app = fs.readFileSync('app.js', 'utf8'); app = app.replaceAll('onclick=\"closeModal()\"', 'data-close-modal'); fs.writeFileSync('app.js', app);
