// Just a hello world default for now.

const http = require('http');
const port = 3000;

const requestHandler = (request, response) => {
  console.log(request.url)
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  response.end('Hello World!\n')
}
const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('Error: ', err)
  }

  console.log(`server is listening on ${port}`)
})