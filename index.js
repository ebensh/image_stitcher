const child_process = require('child_process');
const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const iconv = require('iconv-lite');
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
app.use('/public', express.static(__dirname + '/public'));

// TODO: Replace local tmp storage on Heroku ephemeral filesystem
// with Amazon S3 (or equivalent) storage service.

// This handler will return a page's image (or really, any file in that
// directory). We could use express middleware to serve the entire page
// directory, but I'm expanding it here for learning purposes.
app.get('/pages/:name/:demo?', function(req, res, next) {
  var options = {
    root: path.join(__dirname, '/pages/', req.params.demo ? 'demo/' : ''),
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
    let firstPage = fields.firstpage;
    let lastPage = fields.lastpage;
    let basename = path.basename(pdfPath);
    let directory = path.dirname(pdfPath);
    console.log('Received new uploaded PDF: ', pdfPath);

    console.log(`Processing ${pdfPath} from ${firstPage} to ${lastPage}`);
    // TODO: Don't block this thread! Build some kind of work queue and
    // an offline process to do the heavy-lifting.
    // child_process.execFileSync('pdftocairo',
    //     ['-png', pdfPath, '-r', '150', '-f', firstPage, '-l', lastPage]);
    // var pages = fs.readdirSync(directory).filter(
    //     filename => path.basename(filename) == basename
    //         && filename.endsWith('.png'));

    let pdfImage = new PDFImage(pdfPath,
        {outputDirectory: path.join(__dirname, '/pages/')});
    // This is super janky, but we want to use pdftocairo instead of
    // imagemagick's conversion function.
    //pdfImage.


    console.log('Processing...');
    pdfImage.convertFile().then(function (imagePaths) {
      // Parse the path to create a dictionary from page # to path.
      pages = new Object();
      for (let path in imagePath) {
        let id = /([0-9]+)\.png/.exec(path)[1];
        pages[id].path = path;
      }

      console.log('Processed PDF, images:', pages);
      res.redirect(url.format({
        pathname:"/stitcher",
        query: {
          pages: iconv.encode(JSON.stringify(pages), 'utf-8').toString('base64')
        }
     }));
    }).catch(reason => console.log("Couldn't process: ", reason));
  });
});

// Redirect to /stitcher with some demo images.
app.get('/stitcherdemo', function(req, res) {
  pages = {
    2: { path: '/pages/page_02.png/demo' },
    3: { path: '/pages/page_03.png/demo' },
    5: { path: '/pages/page_05.png/demo' },
    6: { path: '/pages/page_06.png/demo' },
  };
  console.log('pages: ', pages);
  console.log('  in json: ', JSON.stringify(pages));
  console.log('  in json in base64: ', iconv.encode(JSON.stringify(pages), 'utf-8').toString('base64'));
  res.redirect(url.format({
    pathname:"/stitcher",
    query: {
      pages: iconv.encode(JSON.stringify(pages), 'utf-8').toString('base64')
    }
  }));
});

app.get('/stitcher', function(req, res) {
  let pages = req.query.pages;
  if (pages == null) {
    res.redirect('/upload')
  }

  res.render('stitcher');
});

app.listen(port, function () {
  console.log(`server is listening on ${port}`);
});