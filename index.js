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
const stop_btn = document.querySelector('#stop-btn');

const btns_container = document.querySelector('#btns-container');

let draw_walls = false;
let select_targets = false;
let select_bfs_root = false;

let mouse_down = false;
// There can be just a single bfs root point
let bfsroot_selected = false;
let bfsroot = null;
let bfs_freezed = false;

let prev_target_hover = null;
let prev_bfsroot_hover = null;
let active_btn = draw_walls_btn; // Just a random initial one

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
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('mousedown', (e) => {
    // 0 is the left button
    if (e.button === 0) mouse_down = true;
});
document.addEventListener('mouseup', () => mouse_down = false);

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
            cell.classList.remove('visited');
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

run_btn.addEventListener('click', async e => {
    active_btn.classList.remove('btn-active');
    e.target.classList.add('btn-active');
    active_btn = e.target;

    draw_walls = false;
    select_targets = false;
    select_bfs_root = false;

    btns_container.childNodes.forEach(btn => {
        if (btn !== stop_btn) btn.disabled = true;
    });
    
    // if bfs is not freezed, run bfs
    // if (bfs_freezed) {

    // } else {
    //     bfs();
    // }

    // otherwise, resume execution

    await dfs();
});

stop_btn.addEventListener('click', async e => {
    bfs_freezed = true;
    btns_container.childNodes.forEach(btn => btn.disabled = false);
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
        }
    }
    if (select_targets) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('bfsroot')) {
            // No need to check whether the class is already present.
            // In that case is simply omitted
            e.target.classList.add('target');
        }
    }
    if (select_bfs_root && !bfsroot_selected) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('target')) {
            bfsroot = e.target;
            bfsroot.classList.remove('bfsroot-hover');
            bfsroot.classList.add('bfsroot');
            bfsroot_selected = true;
        }
    }
});

async function bfs() 
{
    const visited = new Set();
    const q = [ bfsroot ];
    let target_found = false;
    let steps = 0;
    while (q.length > 0) {
        const curr = q.shift();
        steps += 1;
        if (curr.classList.contains('wall')) continue;
        if (curr.classList.contains('target')) {
            target_found = true;
            break;
        }
        const curr_x = Number(curr.textContent.split(',')[0]);
        const curr_y = Number(curr.textContent.split(',')[1]);
        if (visited.has(curr_x + ',' + curr_y)) continue;
        visited.add(curr_x + ',' + curr_y);
        curr.classList.add('visited');
        await new Promise(resolve => setTimeout(resolve, 20));
        
        if (curr_x > 0) q.push(grid.childNodes[curr_x - 1].childNodes[curr_y]);
        if (curr_y < grid.childNodes[curr_x].childNodes.length - 1) q.push(grid.childNodes[curr_x].childNodes[curr_y + 1]);
        if (curr_x < grid.childNodes.length - 1) q.push(grid.childNodes[curr_x + 1].childNodes[curr_y]);
        if (curr_y > 0) q.push(grid.childNodes[curr_x].childNodes[curr_y - 1]);
    }

    document.querySelector('#target-found').textContent += target_found;
    document.querySelector('#steps').textContent += steps;
    document.querySelector('#cells-visited').textContent += visited.size;
}

// grid could be a parameter
async function dfs() 
{
    const visited = new Set();
    const explore = async (x, y, visited) => {
        const x_in_bounds = 0 <= x && x < grid.childNodes.length;
        const y_in_bounds = 0 <= y && y < grid.childNodes[0].childNodes.length;
        if (!x_in_bounds || !y_in_bounds) return;
        const curr = grid.childNodes[x].childNodes[y];
        
        await new Promise(resolve => setTimeout(resolve, 20));

        if (curr.classList.contains('target')) return;
        if (curr.classList.contains('wall')) return;

        const pos = x + ',' + y;
        if (visited.has(pos)) return;
        visited.add(pos);
        curr.classList.add('visited');

        await explore(x - 1, y, visited)
        await explore(x, y + 1, visited)
        await explore(x + 1, y, visited)
        await explore(x, y - 1, visited)
    }
    await explore(bfsroot.textContent.split(',')[0], bfsroot.textContent.split(',')[1], visited);
}

// async function explore(x, y, visited) {
//     if (stop_bfs_execution) return;
//     // console.log('entered function', ++i);
//     const x_in_bounds = 0 <= x && x < grid.childNodes.length;
//     const y_in_bounds = 0 <= y && y < grid.childNodes[0].childNodes.length;
//     if (!x_in_bounds || !y_in_bounds) return;

//     const curr_cell = grid.childNodes[x].childNodes[y];

//     // The waiting is just to let the user observe the algorithmic steps
//     await sleep(1000);

//     if (curr_cell.classList.contains('target')) return;
//     if (curr_cell.classList.contains('wall')) return;

//     const pos = x + ',' + y;
//     if (visited.has(pos)) {
//         // console.log('already visited: ', x, y);
//         return;
//     }

//     visited.add(pos);
//     curr_cell.classList.add('visited');

//     explore(x - 1, y, visited)
//     explore(x + 1, y, visited)
//     explore(x, y - 1, visited)
//     explore(x, y + 1, visited)
//     return;
// }


