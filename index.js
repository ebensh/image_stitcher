// Just a hello world default for now.

const http = require('http');
const port = 80;  // Heroku requires port 80

const requestHandler = (req, res) => {
  console.log(req.url)
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World!\n')
}
const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('Error: ', err)
  }

  console.log(`server is listening on ${port}`)
})