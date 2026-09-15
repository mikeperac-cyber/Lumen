const http = require('http');
const serveHandler = require('serve-handler');

const port = process.env.PORT || 8092;

const server = http.createServer((request, response) => {
  return serveHandler(request, response, {
    public: 'dist',
    cleanUrls: true,
    rewrites: [
      { source: '**', destination: '/index.html' }
    ]
  });
});

server.listen(port, () => {
  console.log(`Running at http://localhost:${port}`);
});
