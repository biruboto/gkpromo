const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };

http.createServer((request, response) => {
  if (request.url === '/fonts') {
    return fs.readdir(path.join(root, 'assets', 'fonts'), (error, files) => {
      response.writeHead(error ? 500 : 200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(error ? [] : files.filter(file => file.endsWith('.json')).map(file => path.basename(file, '.json')).sort()));
    });
  }
  const file = request.url === '/' ? 'index.html' : decodeURIComponent(request.url.slice(1));
  const target = path.resolve(root, file);
  if (!target.startsWith(root + path.sep)) { response.writeHead(403); return response.end('Forbidden'); }
  fs.readFile(target, (error, content) => {
    response.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    response.end(error ? 'Not found' : content);
  });
}).listen(4173, () => console.log('HUD at http://localhost:4173'));
