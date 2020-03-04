import seedrandom from 'seed-random';

export default class {
  constructor(
    width,
    height,
    {
      initiate_chance = 0.8,
      extension_chance = 0.8,
      vertical_chance = 0.8,
      horizontal_symmetry = true,
      vertical_symmetry = false,
      roundness = 0.1,
      solidness = 0.5,
      colors = [],
      color_mode = 'group',
      group_size = 0.8,
      simple = false,
      simplex = null,
      rate_of_change = 0.01,
    } = {}
  ) {
    this.xdim = Math.round(width * 2 + 11, 0);
    this.ydim = Math.round(height * 2 + 11, 0);
    this.radius_x = width;
    this.radius_y = height;
    this.chance_new = initiate_chance;
    this.chance_extend = extension_chance;
    this.chance_vertical = vertical_chance;
    this.colors = colors;
    this.color_mode = color_mode;
    this.group_size = group_size;
    this.h_symmetric = horizontal_symmetry;
    this.v_symmetric = vertical_symmetry;
    this.roundness = roundness;
    this.solidness = solidness;
    this.simple = simple;
    this.simplex = simplex;
    this.rate_of_change = rate_of_change;
    this.global_seed = Math.random();
  }

  generate(initial_top = null, initial_left = null, verbose = false, idx = 0, idy = 0) {
    this.idx = idx;
    this.idy = idy;

    this.main_color = this.get_random(this.colors, 1, 1);
    this.id_counter = 0;

    let grid = new Array(this.ydim + 1);
    for (var i = 0; i < grid.length; i++) {
      grid[i] = new Array(this.xdim + 1);
      for (var j = 0; j < grid[i].length; j++) {
        if (i == 0 || j == 0) grid[i][j] = { h: false, v: false, in: false, col: null };
        else if (i == 1 && initial_top != null) grid[i][j] = { ...initial_top[j], h: true };
        else if (j == 1 && initial_left != null) grid[i][j] = { ...initial_left[i], v: true };
        else if (this.h_symmetric && j > grid[i].length / 2) {
          grid[i][j] = deep_copy(grid[i][grid[i].length - j]);
          grid[i][j].v = grid[i][grid[i].length - j + 1].v;
        } else if (this.v_symmetric && i > grid.length / 2) {
          grid[i][j] = deep_copy(grid[grid.length - i][j]);
          grid[i][j].h = grid[grid.length - i + 1][j].h;
        } else {
          grid[i][j] = this.next_block(j, i, grid[i][j - 1], grid[i - 1][j]);
        }
      }
    }
    let rects = convert_linegrid_to_rectangles(grid);
    return verbose ? [rects, grid] : rects;
  }

  next_block(x, y, left, top) {
    const context = this;

    if (!left.in && !top.in) {
      return block_set_1(x, y);
    }

    if (left.in && !top.in) {
      if (left.h) return block_set_3(x, y);
      return block_set_2(x, y);
    }

    if (!left.in && top.in) {
      if (top.v) return block_set_5(x, y);
      return block_set_4(x, y);
    }

    if (left.in && top.in) {
      if (!left.h && !top.v) return block_set_6();
      if (left.h && !top.v) return block_set_7(x, y);
      if (!left.h && top.v) return block_set_8(x, y);
      return block_set_9(x, y);
    }

    // --- Block sets ----

    function block_set_1(x, y) {
      if (start_new_from_blank(x, y)) return new_block(x, y);
      return { v: false, h: false, in: false, col: null, id: null };
    }

    function block_set_2(x, y) {
      if (start_new_from_blank(x, y)) return new_block(x, y);
      return { v: true, h: false, in: false, col: null, id: null };
    }

    function block_set_3(x, y) {
      if (extend(x, y)) return { v: false, h: true, in: true, col: left.col, id: left.id };
      return block_set_2(x, y);
    }

    function block_set_4(x, y) {
      if (start_new_from_blank(x, y)) return new_block(x, y);
      return { v: false, h: true, in: false, col: null, id: null };
    }

    function block_set_5(x, y) {
      if (extend(x, y)) return { v: true, h: false, in: true, col: top.col, id: top.id };
      return block_set_4(x, y);
    }

    function block_set_6() {
      return { v: false, h: false, in: true, col: left.col, id: left.id };
    }

    function block_set_7(x, y) {
      if (extend(x, y)) return { v: false, h: true, in: true, col: left.col, id: left.id };
      if (start_new(x, y)) return new_block(x, y);
      return { v: true, h: true, in: false, col: null, id: null };
    }

    function block_set_8(x, y) {
      if (extend(x, y)) return { v: true, h: false, in: true, col: top.col, id: top.id };
      if (start_new(x, y)) return new_block(x, y);
      return { v: true, h: true, in: false, col: null, id: null };
    }

    function block_set_9(x, y) {
      if (vertical_dir(x, y)) return { v: true, h: false, in: true, col: top.col, id: top.id };
      return { v: false, h: true, in: true, col: left.col, id: left.id };
    }

    // ---- Blocks ----

    function new_block(nx, ny) {
      let col;
      if (context.color_mode === 'random') {
        col = context.get_random(context.colors, nx, ny);
      } else if (context.color_mode === 'main') {
        col = context.noise(x, y, '_main') > 0.75 ? context.get_random(context.colors, x, y) : context.main_color;
      } else if (context.color_mode === 'group') {
        let keep = context.noise(x, y, '_keep') > 0.5 ? left.col : top.col;
        context.main_color =
          context.noise(x, y, '_group') > context.group_size
            ? context.get_random(context.colors, x, y)
            : keep || context.main_color;
        col = context.main_color;
      } else {
        col = context.main_color;
      }

      return { v: true, h: true, in: true, col: col, id: context.id_counter++ };
    }

    // ---- Decisions ----

    function start_new_from_blank(x, y) {
      if (context.simple) return true;
      if (!active_position(x, y, -1 * (1 - context.roundness))) return false;
      return context.noise(x, y, '_blank') <= context.solidness;
    }

    function start_new(x, y) {
      if (context.simple) return true;
      if (!active_position(x, y, 0)) return false;
      return context.noise(x, y, '_new') <= context.chance_new;
    }

    function extend(x, y) {
      if (!active_position(x, y, 1 - context.roundness) && !context.simple) return false;
      return context.noise(x, y, '_extend') <= context.chance_extend;
    }

    function vertical_dir(x, y) {
      return context.noise(x, y, '_vert') <= context.chance_vertical;
    }

    function active_position(x, y, fuzzy) {
      let fuzziness = 1 + context.noise(x, y, '_active') * fuzzy;
      let xa = Math.pow(x - context.xdim / 2, 2) / Math.pow(context.radius_x * fuzziness, 2);
      let ya = Math.pow(y - context.ydim / 2, 2) / Math.pow(context.radius_y * fuzziness, 2);
      return xa + ya < 1;
    }
  }

  noise(nx, ny, nz = '') {
    if (!this.simplex) return Math.random();
    const rng = seedrandom('' + this.global_seed + nx + ny + nz);
    const n = this.simplex.noise3D(this.idx * this.rate_of_change, this.idy * this.rate_of_change, rng() * 23.4567);
    return (n + 1) / 2;
  }

  get_random(array, nx, ny) {
    return array[Math.floor(this.noise(nx, ny, '_array') * array.length)];
  }
}

function deep_copy(obj) {
  let nobj = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      nobj[key] = obj[key];
    }
  }
  return nobj;
}

// --- Conversion ---
function convert_linegrid_to_rectangles(grid) {
  let nw_corners = get_nw_corners(grid);
  extend_corners_to_rectangles(nw_corners, grid);
  return nw_corners;
}

function get_nw_corners(grid) {
  let nw_corners = [];
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      let cell = grid[i][j];
      if (cell.h && cell.v && cell.in) nw_corners.push({ x1: j, y1: i, col: cell.col, id: cell.id });
    }
  }
  return nw_corners;
}

function extend_corners_to_rectangles(corners, grid) {
  corners.map(c => {
    let accx = 1;
    while (c.x1 + accx < grid[c.y1].length && !grid[c.y1][c.x1 + accx].v) {
      accx++;
    }
    let accy = 1;
    while (c.y1 + accy < grid.length && !grid[c.y1 + accy][c.x1].h) {
      accy++;
    }
    c.w = accx;
    c.h = accy;
    return c;
  });
}
