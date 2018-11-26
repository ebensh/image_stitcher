const kDebugging = false;

function create2DArray(rows, cols) {
  console.log("In create2DArray: ", rows, cols)
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
  let spacing_horizontal = app.stitchSpaceHorizontal;
  let spacing_vertical = app.stitchSpaceVertical;
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
  console.log(imageForSizing.naturalWidth, imageForSizing.naturalHeight);
  let scaled_width = Math.round(scale * imageForSizing.width);
  let scaled_height = Math.round(scale * imageForSizing.height);
  let scaled_spacing_horizontal = Math.round(scale * spacing_horizontal);
  let scaled_spacing_vertical = Math.round(scale * spacing_vertical);

  canvas.width = num_imgs_wide * scaled_width + (num_imgs_wide - 1) * scaled_spacing_horizontal;
  canvas.height = num_imgs_tall * scaled_height + (num_imgs_tall - 1) * scaled_spacing_vertical;

  app.pageLayout.forEach(function(row, row_index) {
    row.forEach(function(page_index, col_index) {
      if (page_index > 0) {
        let img = new Image();
        img.src = app.pages[page_index].path;

        let x = col_index * (scaled_width + scaled_spacing_horizontal);
        let y = row_index * (scaled_height + scaled_spacing_vertical);
        ctx.drawImage(img, x, y, scaled_width, scaled_height);

        console.log("Drew ", img.src, " to ", x, y, scaled_width, scaled_height)
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
    layoutRows: 3,
    layoutCols: 4,
    stitchSpaceHorizontal: -25,
    stitchSpaceVertical: -25,
    stitchScale: 0.25,
    pageLayout: create2DArray(3, 4)
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
    // The pages data is loaded by now. We make sure the grid is large
    // enough (increasing by 1 row and 1 col until it is), then insert
    // the loaded images.
    while (this.layoutRows * this.layoutCols < this.pages.length) {
      this.layoutRows++;
      this.layoutCols++;
    }

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
      console.log("this.pages: ", this.pages[pageIndex]);
      loadImage(this.pages[pageIndex].path)
      .then(img => Vue.set(this.pages[pageIndex], "image", img))
      .catch(error => console.error(error));
    }
  }
});
