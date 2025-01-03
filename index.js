/*
    TODO 28/12:
    How to manage the virtual grid,
    when to push changes to the real one,
    how to retrieve info from the real one, 
*/

const grid = document.querySelector('#grid');
const btns_container = document.querySelector('#btns-container');

const clear_btn = document.querySelector('#clear-btn');
const draw_walls_btn = document.querySelector('#draw-walls-btn');
const select_targets_btn = document.querySelector('#select-targets-btn');
const select_bfs_root_btn = document.querySelector('#select-bfs-root');
//
const run_btn = document.querySelector('#run-btn');
const stop_btn = document.querySelector('#stop-btn');
//
const undo_btn = document.querySelector('#undo-btn');
const redo_btn = document.querySelector('#redo-btn');

const history_dim = 10;
const history = new Array(history_dim);
let history_idx = -1;

let targets = 0;

// 'f' stands for flag
let f_draw_walls = false;
let f_select_targets = false;
let f_select_bfs_root = false;

let mouse_down = false;

let bfsroot = null;
let bfs_freezed = false;

let prev_target_hover = null;
let prev_bfsroot_hover = null;

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
let mousedown_target = null;
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('mousedown', (e) => {
    // 0 is the left button
    if (e.button === 0) {
        mouse_down = true;
        if (e.target.classList.contains('cell') &&
            !e.target.classList.contains('wall') &&
            !e.target.classList.contains('bfsroot') &&
            !e.target.classList.contains('target')) {
            mousedown_target = e.target;
        }
    }
});
document.addEventListener('mouseup', () => mouse_down = false);

/**
 * 
 * Dashboard buttons
 */

clear_btn.addEventListener('click', (e) => 
{
    run_btn.textContent = 'run';
    run_btn.disabled = true;
    select_bfs_root_btn.disabled = false;

    f_select_targets = false;
    f_draw_walls = false;

    bfsroot = null;
    grid.childNodes.forEach(row => {
        row.childNodes.forEach(cell => {
            cell.classList.remove('wall');
            cell.classList.remove('target');
            cell.classList.remove('bfsroot');
            cell.classList.remove('visited');
        }); 
    });
});

draw_walls_btn.addEventListener('click', () => 
{
    f_select_targets = false;
    f_draw_walls = true;
});

select_targets_btn.addEventListener('click', () => 
{
    f_draw_walls = false;
    f_select_targets = true;
});

select_bfs_root_btn.addEventListener('click', () => 
{
    f_draw_walls = false;
    f_select_targets = false;
    if (!bfsroot) f_select_bfs_root = true;
    else console.error('Error: select_bfs_root_btn: bfs root already selected.');
});

let is_run = true;
run_btn.addEventListener('click', async e => 
{
    if (!is_run) // is reset
    { 
        run_btn.textContent = 'run';
        stop_btn.textContent = 'stop';
        stop_btn.disabled = true;
        grid.childNodes.forEach(row => {
            row.childNodes.forEach(cell => {
                cell.classList.remove('visited');
            });
        });
        draw_walls_btn.disabled = select_targets_btn.disabled =
            clear_btn.disabled = false;

        reset_freezed_data();
        bfs_freezed = false;
        is_stop = true;
        is_run = true;
    }
    else
    {
        /* The only condition to run the algo,
        is to have the bfsroot selected. 
        The target is not needed because I may want to just visualize the 
        algorithmic pattern. Same reason for walls. */
        if (!bfsroot) {
            document.querySelector('#err-msg').textContent = 'Error: no bfsroot selected.';
            return;
        }

        /* I want the UI change to be as fast as possible.
        So, it is the first thing I do. */
        run_btn.disabled = true;
        run_btn.textContent = 'reset';

        is_run = false;
    
        f_draw_walls = false;
        f_select_targets = false;
    
        btns_container.childNodes.forEach(btn => btn.disabled = true);
        stop_btn.disabled = false;
        
        let algo_name = 'bfs';
        document.querySelectorAll('.algo').forEach(input => {
            if (input.checked) {
                algo_name = input.value;
                return;
            }
        });
        if (algo_name === 'bfs') await bfs();
        else if (algo_name === 'dfs') await dfs();
        else console.error('Error: the algorithm specified is not valid.');
        
        if (!bfs_freezed) {
            stop_btn.disabled = true;
            clear_btn.disabled = run_btn.disabled = false;
        }
    }
});

let is_stop = true;
stop_btn.addEventListener('click', async e => {
    if (is_stop) {
        stop_btn.textContent = 'resume';
        run_btn.disabled = false;
        bfs_freezed = true;
        is_stop = false;
    } else {
        stop_btn.textContent = 'stop';
        run_btn.disabled = true;
        /* what happens if I reach this exact point and 
        the user immediately clicks again? */
        bfs_freezed = false;
        is_stop = true;
        await bfs();
    }
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

    if (mouse_down && f_draw_walls) {
        if (mousedown_target) {
            mousedown_target.classList.add('wall');
            mousedown_target = null;
        }
        if (!e.target.classList.contains('target') &&
            !e.target.classList.contains('bfsroot')) {
            e.target.classList.add('wall');
            update_history('wall', e.target.textContent);
        }
    }

    if (f_select_targets) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('bfsroot')) {
            if (prev_target_hover) prev_target_hover.classList.remove('target-hover');
            e.target.classList.add('target-hover');
            prev_target_hover = e.target;
        }
    }

    if (f_select_bfs_root && !bfsroot) {
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
    if (/*!mouse_down &&*/ f_draw_walls) {
        if (!e.target.classList.contains('target') &&
            !e.target.classList.contains('bfsroot')) {
            e.target.classList.add('wall');
            update_history('wall', e.target.textContent);
        }
    }
    if (f_select_targets) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('bfsroot')) {
            // No need to check whether the class is already present.
            // In that case is simply omitted
            e.target.classList.add('target');
            targets += 1;
            update_history('target', e.target.textContent);
        }
    }
    if (f_select_bfs_root && !bfsroot) {
        if (!e.target.classList.contains('wall') &&
            !e.target.classList.contains('target')) {
            bfsroot = e.target;
            bfsroot.classList.remove('bfsroot-hover');
            bfsroot.classList.add('bfsroot');
            run_btn.disabled = false;
            select_bfs_root_btn.disabled = true;
            update_history('bfsroot', e.target.textContent);

            /* as soon as the bfsroot is selected, 
            I set the flag to false because no other roots
            can be selected. */
            f_select_bfs_root = false;
        }
    }
});

let freezed_q = null;
let freezed_visited = null;
let freezed_targets_found = 0;
let freezed_steps = 0;

function reset_freezed_data() {
    freezed_q = null;
    freezed_visited = null;
    freezed_targets_found = 0;
    freezed_steps = 0;
}

async function bfs() 
{
    if (!bfsroot) {
        /* I want the algos API to be independent from the UI 
        (more precisely, the HTML). So, I do not assume the bfsroot
        to be defined when bfs() is called, even though it cannot
        happen by 'following the UI'.
        If, for instance, I enter the inspection panel of the browser 
        and I remove the disabled attribute from the stop button,
        I can click 2 times on this last button to call
        bfs() without bfsroot being defined. */
        console.error('Error: no bfsroot selected.');
        return;
    }

    const visited = freezed_visited === null ? new Set() : freezed_visited;
    const q = freezed_q !== null ? freezed_q : [ bfsroot ];
    let targets_found = freezed_targets_found;
    let steps = freezed_steps;
    while (q.length > 0) 
    {
        if (bfs_freezed) {
            freezed_q = q;
            freezed_visited = visited;
            freezed_targets_found = targets_found;
            freezed_steps = steps;
            break;
        }
        
        if (targets > 0 && targets_found === targets) break;
        
        steps += 1;
        const curr = q.shift();
        if (curr.classList.contains('wall')) continue;

        const curr_x = Number(curr.textContent.split(',')[0]);
        const curr_y = Number(curr.textContent.split(',')[1]);
        
        if (visited.has(curr_x + ',' + curr_y)) continue;
        visited.add(curr_x + ',' + curr_y);
        curr.classList.add('visited');
        if (curr.classList.contains('target')) targets_found += 1;

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (curr_x > 0) q.push(grid.childNodes[curr_x - 1].childNodes[curr_y]);
        if (curr_y < grid.childNodes[curr_x].childNodes.length - 1) q.push(grid.childNodes[curr_x].childNodes[curr_y + 1]);
        if (curr_x < grid.childNodes.length - 1) q.push(grid.childNodes[curr_x + 1].childNodes[curr_y]);
        if (curr_y > 0) q.push(grid.childNodes[curr_x].childNodes[curr_y - 1]);
    }

    /* terminated 'naturally' if q.length === 0 or 
        (targets_found === targets && targets > 0) */
    if (!bfs_freezed) {
        update_res(targets > 0 && targets_found === targets, visited.size, steps);
        // TODO reset freezed data
    }
}

// grid could be a parameter
async function dfs() 
{
    if (!bfsroot) {
        console.error('Error: dfs: no bfsroot defined.');
        return;
    }
    const visited = new Set();
    let targets_found = 0;
    let steps = 0;
    const explore = async (x, y, visited) => {
        if (targets > 0 && targets_found === targets) return;
        steps += 1;
        
        const x_in_bounds = 0 <= x && x < grid.childNodes.length;
        const y_in_bounds = 0 <= y && y < grid.childNodes[0].childNodes.length;
        if (!x_in_bounds || !y_in_bounds) return;
        
        const curr = grid.childNodes[x].childNodes[y];
        if (curr.classList.contains('wall')) return;
        
        const pos = x + ',' + y;
        if (visited.has(pos)) return;
        visited.add(pos);
        curr.classList.add('visited');
        if (curr.classList.contains('target')) targets_found += 1;

        await new Promise(resolve => setTimeout(resolve, 20));

        await explore(x - 1, y, visited)
        await explore(x, y + 1, visited)
        await explore(x + 1, y, visited)
        await explore(x, y - 1, visited)
    }
    await explore(Number(bfsroot.textContent.split(',')[0]), Number(bfsroot.textContent.split(',')[1]), visited);
    
    update_res(targets > 0 && targets_found === targets, visited.size, steps);
}

function update_res(target_found, cells_visited, steps) {
    document.querySelector('#target-found').textContent = target_found;
    document.querySelector('#cells-visited').textContent = cells_visited;
    document.querySelector('#steps').textContent = steps;
}

function update_history(_class, coordinates) {
    history_idx += 1;
    history.push(_class + ',' + coordinates);
    if (history_idx >= 0) {
        undo_btn.disabled = false;
        redo_btn.disabled = false;
    }
}

undo_btn.addEventListener('click', () => {
    let last_move = history[history_idx];
    let info = last_move.split(',');
    let _class = info[0], x = info[1], y = info[2];
    grid.childNodes[x].childNodes[y].classList.remove(_class);
});


