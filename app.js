// Entry point for host environments (such as Render) that default to executing `node app.js`
const server = require('./server.js');
const PORT = process.env.PORT || 8092;

if (!server.listening) {
  server.listen(PORT, () => {
    console.log(`Lumen static server running on port ${PORT}`);
  });
}
