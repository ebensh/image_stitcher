const kDebugging = true;

function create2DArray(rows, cols) {
  console.log("In create2DArray: ", rows, cols)
  array = Array(rows);
  for (let r = 0; r < rows; ++r) {
    array[r] = Array(cols).fill(0);
  }
  return array;
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

Vue.component('stitched-view', {
  props: ['pages', 'pageLayout'],
  template: `
    <canvas width="300px" height="300px">`
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
  if (!url) { return null; }
  let serialized_pages = url.searchParams.get('pages');
  if (!serialized_pages) { return null; }
  return JSON.parse(btoa(serialized_pages));
}

var app = new Vue({
  el: '#app',
  data: {
    pages: getPagesFromURL(),
    layoutRows: 3,
    layoutCols: 4,
    spaceHorizontal: -25,
    spaceVertical: -25,
    pageLayout: create2DArray(3, 4)
  },
  methods: {
    updateLayout: function (event) {
      console.log("Updating layout :)");
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
    },
  },
  created() {
    if (kDebugging) {
      console.log("In created(), this:", this);

      // We can't directly set the layout array's values, because Vue will
      // not notice the update. Instead we must go through Vue.
      Vue.set(this.pageLayout[0], 0, 2);
      Vue.set(this.pageLayout[0], 1, 3);
      Vue.set(this.pageLayout[1], 0, 6);
      Vue.set(this.pageLayout[1], 1, 5);
    }
  }
});





/*


function setPages(pages) {
  document.getElementById("pages").value = pages;
}

function setParameters() {
  var num_rows = document.getElementById("layout_num_rows").value;
  var num_cols = document.getElementById("layout_num_cols").value;
  var join_horizontal_space = document.getElementById("join_horizontal_space").value;
  var join_vertical_space = document.getElementById("join_vertical_space").value;
  //layout_num_rows = document.getElementById("layout");
}

// The "model" of our MVC. It keeps track of the indices of which
// images are in which slot. It can also translate those indices into
// image source paths.
function ImageLayout(pages, options) {
  if (!options) options = {};

  // Pages should be a list of image srcs.
  this.pages = pages;

  this.num_cols = options.num_cols || 4;
  this.num_rows = options.num_rows || 1;
  while (this.num_cols * this.num_rows < pages) {
    this.num_rows++;
  }

  this.layout = create2DArray(this.num_rows, this.num_cols);
  // Seed the layout with a naive ordering.
  for (int i = 0; i < pages.length; ++i) {
    let row = Math.floor(i / this.num_cols);
    let col = i - row * this.num_cols;
    this.layout[row][col] = i;
  }
}

function init(pages) {
  let small_pages = document.getElementById("small_pages");
  
  page_paths.forEach(function(path, index) {
    let small_page = new Image();
    small_page.id = "small_page" + index;
    small_page.src = path;
    small_page.className = "small_page";
    small_page.ondragstart = small_page_dragstart_handler;
    small_page.page_index = index;
    small_page_imgs.push(small_page);
    small_pages.appendChild(small_page);
  });

  let layout = document.getElementById("layout");
  let layout_body = layout.querySelector(":scope tbody");
  console.log(layout);

  page_layout.forEach(function(row, row_index) {
    let tr = layout_body.insertRow();
    tr.id = "row_" + row_index;
    layout_body.appendChild(tr);
    row.forEach(function(col, col_index) {
      let slot = tr.insertCell();
      slot.id = tr.id + "_slot_" + col_index;
      slot.page_layout_row = row_index;
      slot.page_layout_col = col_index;
      slot.className = "page_slot";
      slot.ondragover = layout_dragover_handler;
      slot.ondrop = layout_drop_handler;
    });
  });
}

function small_page_dragstart_handler(ev) {
  console.log("dragging " + ev.target.id);
  // Add the target element's id to the data transfer object.
  ev.dataTransfer.setData("text/plain", ev.target.id);
  // Stylize the drag effect so it looks like a move.
  ev.dataTransfer.dropEffect = "move";
}

function layout_dragover_handler(ev) {
  ev.preventDefault();
  // Stylize the drop effect so it looks like a move.
  ev.dataTransfer.dropEffect = "move"
}

function layout_drop_handler(ev) {
  ev.preventDefault();

  // Get the id of the target and add the moved element to the target's DOM.
  let dragged_id = ev.dataTransfer.getData("text/plain");
  let dropped_id = ev.target.id;
  console.log("dragged " + dragged_id + " onto " + dropped_id);

  let dragged_img = document.getElementById(dragged_id);
  let prev_parent = dragged_img.parentElement;
  let new_parent = ev.target;
  // If an image is already in the slot, boot it.
  if (new_parent.className == "small_page") {
    new_parent = new_parent.parentNode;
    page_layout[new_parent.page_layout_row][new_parent.page_layout_col] = null;
    let small_pages = document.getElementById("small_pages");
    small_pages.appendChild(new_parent.children[0]);
  }

  // If we're moving from already in the layout, clear the old parent.
  if (prev_parent.className == "page_slot") {
    page_layout[prev_parent.page_layout_row][prev_parent.page_layout_col] = null;
  }
  
  page_layout[new_parent.page_layout_row][new_parent.page_layout_col] = dragged_img.page_index;
  new_parent.appendChild(dragged_img);

  draw_joined();
}

function draw_joined() {
  // TODO: Parameterize.
  let spacing_horizontal = 0;  // Typical values are 0, 25  50, 75, 100
  let spacing_vertical = 0;

  let canvas = document.getElementById("combined");
  let ctx = canvas.getContext('2d');

  let num_imgs_wide = page_layout[0].length;
  let num_imgs_tall = page_layout.length;
  let scale = 300.0 / small_page_imgs[0].width;
  let scaled_width = Math.floor(scale * small_page_imgs[0].width)
  let scaled_height = Math.floor(scale * small_page_imgs[0].height)
  let scaled_spacing_horizontal = Math.floor(scale * spacing_horizontal);
  let scaled_spacing_vertical = Math.floor(scale * spacing_vertical);

  canvas.width = num_imgs_wide * scaled_width + (num_imgs_wide - 1) * scaled_spacing_horizontal;
  canvas.height = num_imgs_tall * scaled_height + (num_imgs_tall - 1) * scaled_spacing_vertical;

  page_layout.forEach(function(row, row_index) {
    row.forEach(function(img_index, col_index) {
      if (img_index != null) {
        let img = small_page_imgs[img_index];
        let x = col_index * (scaled_width + scaled_spacing_horizontal);
        let y = row_index * (scaled_height + scaled_spacing_vertical);
        ctx.drawImage(img, x, y, scaled_width, scaled_height);
      }
    });
  });
}
*/