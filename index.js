/*
    TODO 28/12:
    How to manage the virtual grid,
    when to push changes to the real one,
    how to retrieve info from the real one, 
*/

const grid = document.querySelector('#grid');
const clear_btn = document.querySelector('#clear-btn');
const draw_walls_btn = document.querySelector('#draw-walls-btn');
const select_targets_btn = document.querySelector('#select-targets-btn');
const select_bfs_root_btn = document.querySelector('#select-bfs-root');
const run_btn = document.querySelector('#run-btn');
const btns_container = document.querySelector('#btns-container');

let draw_walls = false;
let select_targets = false;
let select_bfs_root = false;
let run = true;

let mouse_down = false;
// There can be just a single bfs root point
let bfsroot_selected = false;
let stop_bfs_execution = false;

let prev_target_hover = null;
let prev_bfsroot_hover = null;
let active_btn = draw_walls_btn; // Just a random initial one

class Pos {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

let bfsroot_pos;
const targets = new Set();
const walls = new Set();

// 1) build the grid
for (let i = 0; i < 20; i++) {
    // 1.1) build the row
    const row = document.createElement('div');
    row.classList.add('row');
    
    for (let j = 0; j < 20; j++) {
        // 1.2) build the cell
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.textContent = i + ',' + j;
        row.appendChild(cell);
    }
    
    grid.appendChild(row);
}

/*
If I drag over the cells, the mouseup is not detected.
I guess that's because the drop event interferes with mouseup.
So, I disable the dragging on the cells
*/
document.addEventListener('dragstart', e => {
    e.preventDefault();
});
document.addEventListener('mousedown', (e) => {
    // 0 is the left button
    if (e.button === 0) mouse_down = true;
});
document.addEventListener('mouseup', (e) => {
    mouse_down = false;
});

/**
 * 
 * Dashboard buttons
 */

clear_btn.addEventListener('click', (e) => {
    select_targets = false;
    draw_walls = false;
    select_bfs_root = false;

    grid.childNodes.forEach(row => {
        row.childNodes.forEach(cell => {
            cell.classList.remove('wall');
            cell.classList.remove('target');
            cell.classList.remove('bfsroot');
        });
    });
    bfsroot_selected = false;

    active_btn.classList.remove('btn-active');
    e.target.classList.add('btn-active');
    active_btn = e.target;
});

draw_walls_btn.addEventListener('click', (e) => {
    select_targets = false;
    select_bfs_root = false;
    draw_walls = true;
    active_btn.classList.remove('btn-active');
    e.target.classList.add('btn-active');
    active_btn = e.target;
});

select_targets_btn.addEventListener('click', (e) => {
    draw_walls = false;
    select_targets = true;
    select_bfs_root = false;
    active_btn.classList.remove('btn-active');
    e.target.classList.add('btn-active');
    active_btn = e.target;
});

select_bfs_root_btn.addEventListener('click', e => {
    draw_walls = false;
    select_targets = false;
    select_bfs_root = true;
    active_btn.classList.remove('btn-active');
    e.target.classList.add('btn-active');
    active_btn = e.target;
});

run_btn.addEventListener('click', (e) => {
    draw_walls = false;
    select_targets = false;
    select_bfs_root = false;
    active_btn.classList.remove('btn-active');
    e.target.classList.add('btn-active');
    active_btn = e.target;

    run = !run;

    if (run) {
        run_btn.textContent = 'run';
        btns_container.childNodes.forEach(btn => btn.disabled = false);
        stop_bfs_execution = true;
    } else {
        run_btn.textContent = 'stop';
        btns_container.childNodes.forEach(btn => {
            if (btn !== run_btn) btn.disabled = true;
        });
    }

    // console.log(walls)
    // console.log(targets)
    // console.log(bfsroot_pos)
    // const v_grid = virtual_grid(grid);
    start_bfs();
});

/*
    The mouseover event listener is added to the grid
    and not to every single cell because I think it consumes less resources.
    p.s. I do not know if the browser does some kind of optimization in this case. 
*/
grid.addEventListener('mouseover', e => {
    /*
        It's used mouseover and not mousemove because I want this callback
        function to be called for every child-most node hovered (a cell in this case). 
        But, not for every single movement inside a cell
    */

    if (!e.target.classList.contains('cell')) {
        /* For now all the space of the grid and of the rows is occupied by cells.
        So, the target should always be a cell.
        But, it's a security check just in case of future changes in which not
        all space is occupied by cells */
        return;
    }

    if (mouse_down && draw_walls) {
        if (!e.target.classList.contains('target') &&
            !e.target.classList.contains('bfsroot')) {
            e.target.classList.add('wall');
            walls.add(e.target.textContent);
        }
    }

    if (select_targets) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('bfsroot')) {
            if (prev_target_hover) prev_target_hover.classList.remove('target-hover');
            e.target.classList.add('target-hover');
            prev_target_hover = e.target;
        }
    }

    if (select_bfs_root && !bfsroot_selected) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('target')) {
            if (prev_bfsroot_hover) prev_bfsroot_hover.classList.remove('bfsroot-hover');
            e.target.classList.add('bfsroot-hover');
            prev_bfsroot_hover = e.target;
        }
    }
});

grid.addEventListener('mouseleave', () => {
    if (prev_target_hover) prev_target_hover.classList.remove('target-hover');
    if (prev_bfsroot_hover) prev_bfsroot_hover.classList.remove('bfsroot-hover');
});

grid.addEventListener('click', e => {
    if (!e.target.classList.contains('cell')) return;

    /* walls can be drawn in 2 ways:
        - left button + move
        - click
    */
    if (draw_walls) {
        if (!e.target.classList.contains('target') &&
            !e.target.classList.contains('bfsroot')) {
            e.target.classList.add('wall');
            walls.add(e.target.textContent);
        }
    }
    if (select_targets) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('bfsroot')) {
            // No need to check whether the class is already present.
            // In that case is simply omitted
            e.target.classList.add('target');
            targets.add(e.target.textContent);
        }
    }
    if (select_bfs_root && !bfsroot_selected) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('target')) {
            e.target.classList.remove('bfsroot-hover');
            e.target.classList.add('bfsroot');
            bfsroot_selected = true;
            const x = Number(e.target.textContent.split(',')[0]);
            const y = Number(e.target.textContent.split(',')[1]);
            bfsroot_pos = new Pos(x, y);
        }
    }
});

function virtual_grid(grid) {
    
    const v_grid = Array.from({ length: grid.childNodes.length }, 
        () => Array(grid.childNodes[0].childNodes.length).fill('e')); // 'e': empty
    
    for (let i = 0; i < grid.childNodes.length; i++) {
        for (let j = 0; j < grid.childNodes[0].childNodes.length; j++) {
            const class_list = grid.childNodes[i].childNodes[j].classList;
            if (class_list.contains('wall')) v_grid[i][j] = 'w';
            else if (class_list.contains('target')) v_grid[i][j] = 't';
            else v_grid[i][j] = 'e';
        }
    }

    return v_grid;
}

async function start_bfs() {
    const visited = new Set();
    await explore(bfsroot_pos.x, bfsroot_pos.y, visited);
}

let i = 0;
async function explore(x, y, visited) {
    if (stop_bfs_execution) return;
    // console.log('entered function', ++i);
    const x_in_bounds = 0 <= x && x < grid.childNodes.length;
    const y_in_bounds = 0 <= y && y < grid.childNodes[0].childNodes.length;
    if (!x_in_bounds || !y_in_bounds) return;

    const curr_cell = grid.childNodes[x].childNodes[y];

    // The waiting is just to let the user observe the algorithmic steps
    await sleep(1000);

    if (curr_cell.classList.contains('target')) return;
    if (curr_cell.classList.contains('wall')) return;

    const pos = x + ',' + y;
    if (visited.has(pos)) {
        // console.log('already visited: ', x, y);
        return;
    }

    visited.add(pos);
    curr_cell.classList.add('visited');

    explore(x - 1, y, visited)
    explore(x + 1, y, visited)
    explore(x, y - 1, visited)
    explore(x, y + 1, visited)
    return;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

