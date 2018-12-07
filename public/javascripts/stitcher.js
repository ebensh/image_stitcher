const kDebugging = false;

function create2DArray(rows, cols) {
  array = Array(rows);
  for (let r = 0; r < rows; ++r) {
    array[r] = Array(cols).fill(0);
  }

  return array;
}

// Credit: https://jsfiddle.net/fracz/kf8c6t1v/
function loadImage(url) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.addEventListener('load', e => resolve(img));
    img.addEventListener('error', () => {
      reject(new Error(`Failed to load image's URL: ${url}`));
    });
    img.src = url;
  });
}

function layoutDragstartHandler(ev) {
  // Note: we use "ev.currentTarget" instead of "ev.target" here because
  // we want to capture the move element in our <td> or <div>, *not*
  // the image itself.
  target = ev.currentTarget;
  console.log("Drag started from: ", target);

  moveData = JSON.stringify({
    rowindex: target.dataset.rowindex,
    colindex: target.dataset.colindex,
    pageindex: target.dataset.pageindex,
  });

  // Add the target's information to the dataTransfer object.
  ev.dataTransfer.setData("text/plain", moveData);
  // Stylize the drag effect so it looks like a move.
  ev.dataTransfer.dropEffect = "move";
}

function layoutDragoverHandler(ev) {
  ev.preventDefault();

  // Stylize the drop effect so it looks like a move.
  ev.dataTransfer.dropEffect = "move"
}

function layoutDropHandler(ev) {
  ev.preventDefault();

  // Note: we use "this" instead of "ev.target" here because we want to
  // capture the move element in our <td> or <div>, *not* the image.
  let src = JSON.parse(ev.dataTransfer.getData("text/plain"));
  target = ev.currentTarget;
  let dst = {
    rowindex: target.dataset.rowindex,
    colindex: target.dataset.colindex,
    pageindex: target.dataset.pageindex,
  };
  console.log("Dragged ", src, " onto ", dst);

  // Swap the two entries in the layout.
  Vue.set(app.pageLayout[src.rowindex], src.colindex, parseInt(dst.pageindex));
  Vue.set(app.pageLayout[dst.rowindex], dst.colindex, parseInt(src.pageindex));
}


function redrawCanvas() {
  if (typeof app === "undefined") return;
  if (typeof app.pages === "undefined") return;
  if (app.pages.length == 0) return;

  let canvas = document.getElementById("combined");
  let ctx = canvas.getContext('2d');

  let num_imgs_wide = app.layoutCols;
  let num_imgs_tall = app.layoutRows;
  let crop_horizontal = app.stitchCropHorizontal;
  let crop_vertical = app.stitchCropVertical;
  let scale = app.stitchScale;

  // We need to find an image that's already loaded to get its size.
  let imageForSizing = null;
  for (let pageIndex in app.pages) {
    if (typeof app.pages[pageIndex].image === "undefined") {
      continue;
    } else {
      imageForSizing = app.pages[pageIndex].image;
    }
  }
  if (imageForSizing == null) { return; }
  console.log("Natural image size: ",
      {'width': imageForSizing.naturalWidth,
       'height': imageForSizing.naturalHeight});

  let sx = crop_horizontal;
  let sy = crop_vertical;
  let sWidth = imageForSizing.naturalWidth - 2 * crop_horizontal;
  let sHeight = imageForSizing.naturalHeight - 2 * crop_vertical;

  let dWidth = scale * sWidth;
  let dHeight = scale * sHeight;

  canvas.width = num_imgs_wide * dWidth;
  canvas.height = num_imgs_tall * dHeight;

  app.pageLayout.forEach(function(row, row_index) {
    row.forEach(function(page_index, col_index) {
      if (page_index > 0) {
        let img = new Image();
        img.src = app.pages[page_index].path;

        let dx = col_index * dWidth;
        let dy = row_index * dHeight; 
        ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

        console.log("Drew ", img.src, " to ", dx, dy, dWidth, dHeight)
      }
    });
  });
}



Vue.component('small-page-item', {
  props: ['page'],
  template: '<img :src="page.path" width="100px">'
});

Vue.component('small-page-layout-img', {
  props: ['pages', 'rowindex', 'colindex', 'pageindex'],
  template: `
    <div>
      <!--<span>{{rowindex}} {{colindex}} {{pageindex}}</span>-->
      <img :src="pages[pageindex].path" width="100px">
    </div>`
});

function getPagesFromURL() {
  if (kDebugging) {
    return {
      2: { path: 'imgs/page_02.png' },
      3: { path: 'imgs/page_03.png' },
      5: { path: 'imgs/page_05.png' },
      6: { path: 'imgs/page_06.png' }
    };
  }

  let url = new URL(window.location.href);
  if (!url) { 
    console.error("Could not get URL from window");
    return;
  }
  let serialized_pages = url.searchParams.get('pages');
  if (!serialized_pages) {
    console.error("Could not get serialized pages");
    return null;
  }
  parsed_pages = JSON.parse(atob(serialized_pages));
  return parsed_pages;
}

var app = new Vue({
  el: '#app',
  data: {
    pages: getPagesFromURL(),
    layoutRows: 10,
    layoutCols: 10,
    stitchCropHorizontal: 25,
    stitchCropVertical: 25,
    stitchScale: 0.25,
    pageLayout: create2DArray(10, 10)
  },
  methods: {
    updateLayout: function (event) {
      console.log("Updating layout :)");

      // Don't let them go smaller than the number of pages.
      if (app.layoutCols < 1) { app.layoutCols = 1; }
      if (app.layoutRows < 1) { app.layoutRows = 1; }
      while (app.layoutRows * app.layoutCols < app.pages.length) {
        app.layoutRows++;
        app.layoutCols++;
      }

      if (app.pageLayout.length > app.layoutRows) {
        app.pageLayout.splice(app.layoutRows);
      }
      while (app.pageLayout.length < app.layoutRows) {
        app.pageLayout.push(Array(app.layoutCols).fill(0));
      }

      for (let r = 0; r < app.pageLayout.length; ++r) {
        let row = app.pageLayout[r];
        if (row.length > app.layoutCols) {
          row.splice(app.layoutCols);
        }
        while (row.length < app.layoutCols) {
          row.push(0);
        }
      }
      console.log("New Layout: ", app.pageLayout);
    },
    updateRender: function (event) {
      console.log("Updating render :)");
      redrawCanvas();
    },
  },
  watch: {
    pageLayout: function(val) {
      redrawCanvas();
    }
  },
  created() {
    // We can't directly set the layout array's values, because Vue will
    // not notice the update. Instead we must go through Vue.
    console.log(this.pages);
    let i = 0;
    for (let pageIndex in this.pages) {
      let row = Math.floor(i / this.layoutCols);
      let col = i % this.layoutCols; 
      Vue.set(this.pageLayout[row], col, pageIndex);
      i++;
    }

    // Asynchronously load the images, adding them to the pages object.
    // We use Vue.set so it knows about the new property.
    for (let pageIndex in this.pages) {
      loadImage(this.pages[pageIndex].path)
      .then(img => Vue.set(this.pages[pageIndex], "image", img))
      .catch(error => console.error(error));
    }
  }
});
