const express = require('express');
const formidable = require('formidable');
const mustacheExpress = require('mustache-express');
const path = require('path');
const PDFImage = require("pdf-image").PDFImage;
const url = require('url');

const port = process.env.PORT || 8080;   // Heroku's provided port or default.

var app = express();

// Register '.html' extension with The Mustache Express
app.engine('html', mustacheExpress());
app.engine('mustache', mustacheExpress());

app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

// Serve anything in public folder as static content.
app.use(express.static('public'));

// TODO: Replace local tmp storage on Heroku ephemeral filesystem
// with Amazon S3 (or equivalent) storage service.

// This handler will return a page's image (or really, any file in that
// directory). We could use express middleware to serve the entire page
// directory, but I'm expanding it here for learning purposes.
app.get('/pages/:name', function(req, res, next) {
  var options = {
    root: path.join(__dirname, '/pages/'),
    dotfiles: 'deny',
    headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
    }
  };

  var fileName = req.params.name;
  res.sendFile(fileName, options, function (err) {
    if (err) {
      next(err);
    } else {
      console.log('Sent page:', fileName);
    }
  });
});

app.get('/', function (req, res) {
  res.redirect('/upload');
});

app.get('/upload', function(req, res) {
  res.render('upload');
});

app.post('/upload', function(req, res) {
  let form = new formidable.IncomingForm();

  form.parse(req, function(err, fields, files) {
    let pdfPath = files.upload.path;
    console.log('Received new uploaded PDF: ', pdfPath);

    // TODO: Don't block this thread! Build some kind of work queue and
    // an offline process to do the heavy-lifting.
    // child_process.execFile('pdftocairo', ['-png', files.upload.path, '-r', '150']);

    let pdfImage = new PDFImage(pdfPath,
        {outputDirectory: path.join(__dirname, '/pages/')});
    console.log('Processing...');
    pdfImage.convertFile().then(function (imagePaths) {
      console.log('Processed PDF, images:', imagePaths.join(', '));
      res.redirect(url.format({
        pathname:"/stitcher",
        query: {
          pages: imagePaths
          //"basename": path.basename(imagePaths[0]).replace(/-[0-9]+$/, ""),
          //"numpages": imagePaths.length
        }
     }));
    }).catch((reason) => console.log("Couldn't process: ", reason));
  });
});

app.get('/stitcher', function(req, res) {
  let pages = req.query.pages;
  if (pages == null) {
    res.redirect('/upload')
  }

  res.render('stitcher', {pages: pages});
});

app.listen(port, function () {
  console.log(`server is listening on ${port}`);
});