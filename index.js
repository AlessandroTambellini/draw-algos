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

const run_btn = document.querySelector('#run-btn');
const stop_btn = document.querySelector('#stop-btn');

const undo_btn = document.querySelector('#undo-btn');
const redo_btn = document.querySelector('#redo-btn');

const bfs_wrapper = bfs();

const history_dim = 10;
const history = new Array(history_dim);
let history_idx = -1;

// 'f' stands for flag
let f_draw_walls = false;
let f_select_targets = false;
let f_select_bfs_root = false;

let prev_wall_hover = null;
let prev_target_hover = null;
let prev_bfsroot_hover = null;

let is_stop = true;
// let is_run = true;

let mouse_down = false;
let mousedown_target = null;

let bfsroot = null;
let targets = 0;

// 1) build the grid
for (let i = 0; i < 20; i++) 
{
    const row = document.createElement('div');
    row.classList.add('row');

    for (let j = 0; j < 20; j++) 
    {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.textContent = i + ',' + j;
        row.appendChild(cell);
    }
    grid.appendChild(row);
}

/* If I drag over the cells, the mouseup is not detected.
I guess that's because the drop event interferes with mouseup.
So, I disable the dragging on the cells */
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

clear_btn.addEventListener('click', (e) => 
{
    run_btn.textContent = 'run';
    run_btn.disabled = true;
    select_bfs_root_btn.disabled = false;

    f_select_targets = false;
    f_draw_walls = false;

    grid.childNodes.forEach(row => {
        row.childNodes.forEach(cell => {
            cell.classList.remove('wall');
            cell.classList.remove('target');
            cell.classList.remove('bfsroot');
            cell.classList.remove('visited');
        }); 
    });
    bfsroot = null;
    targets = 0;

    draw_walls_btn.disabled = false;
    select_targets_btn.disabled = false;
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

/* run_btn_handler() is just an experiment
to try using a closure to manage a local flag(s).
The same is true for bfs_wrapper(). */
function run_btn_handler() {
    let is_run = true;
    return async function() {
        if (!is_run)
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
    
            bfs_wrapper('f_reset_data');
            bfs_wrapper('f_unfreeze_bfs');
            is_stop = true;
            is_run = true;
        }
        else
        {
            /* The only condition necessary to run the algo,
            is to have the bfsroot selected. 
            The target is not needed because 
            I may want to just visualize the algorithmic pattern. 
            Same reason for walls are not needed. */
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
            let res = null;
            if (algo_name === 'bfs') res = await bfs_wrapper();
            else if (algo_name === 'dfs') await dfs2();
            else console.error('Error: the algorithm specified is not valid.');
            
            if (res) { // the algo terminated 'naturally'
                stop_btn.disabled = true;
                clear_btn.disabled = run_btn.disabled = false;
            }
        }
    }
}

run_btn.addEventListener('click', run_btn_handler());

stop_btn.addEventListener('click', async () => {
    if (is_stop) {
        stop_btn.textContent = 'resume';
        run_btn.disabled = false;
        bfs_wrapper('f_freeze_bfs');
        is_stop = false;
    } else {
        stop_btn.textContent = 'stop';
        run_btn.disabled = true;
        is_stop = true;
        /* what happens if I reach this exact point and 
        the user immediately clicks again? */
        bfs_wrapper('f_unfreeze_bfs');
        await bfs_wrapper();
    }
});

/* 
Note 1: the mouseover event listener is added to the grid
and not to every single cell because I think it consumes less resources.
p.s. I do not know if the browser does some kind of optimization in this case. 

Note 2: before adding a class to an element,
I do not check if the class is already present,
because in that case the add() method simply does not do anything.*/
grid.addEventListener('mouseover', e => {
    /* It's used mouseover and not mousemove because 
    I want this callback function to be called 
    for every child-most node hovered (a cell in this case). 
    But, not for every single movement inside a cell. */
   
    if (!e.target.classList.contains('cell')) {
        /* For now all the space of the grid and of the rows is occupied by cells.
        So, the target should always be a cell.
        But, it's a expandability check just in case of future changes in which not
        all space is occupied by cells */
        return;
    }

    const cell_classlist = e.target.classList;

    if (f_draw_walls) {
        if (!cell_classlist.contains('wall') &&
            !cell_classlist.contains('target') &&
            !cell_classlist.contains('bfsroot')) {
            if (prev_wall_hover) prev_wall_hover.classList.remove('wall-hover');
            cell_classlist.add('wall-hover');
            prev_wall_hover = e.target;
        }
    }

    // if (mouse_down && f_draw_walls) {
    //     if (mousedown_target) {
    //         mousedown_target.classList.add('wall');
    //         mousedown_target = null;
    //     }
    //     if (!e.target.classList.contains('target') &&
    //         !e.target.classList.contains('bfsroot')) {
    //         e.target.classList.add('wall');
    //         // update_history('wall', e.target.textContent);
    //     }
    // }

    else if (f_select_targets) {
        if (!cell_classlist.contains('wall') &&
            !cell_classlist.contains('target') &&
            !cell_classlist.contains('bfsroot')) {
            if (prev_target_hover) prev_target_hover.classList.remove('target-hover');
            cell_classlist.add('target-hover');
            prev_target_hover = e.target;
        }
    }

    if (f_select_bfs_root && !bfsroot) {
        if (!cell_classlist.contains('wall') &&
            !cell_classlist.contains('target')) {
            if (prev_bfsroot_hover) prev_bfsroot_hover.classList.remove('bfsroot-hover');
            cell_classlist.add('bfsroot-hover');
            prev_bfsroot_hover = e.target;
        }
    }
});

grid.addEventListener('mouseleave', () => {
    if (prev_wall_hover) prev_wall_hover.classList.remove('wall-hover');
    if (prev_target_hover) prev_target_hover.classList.remove('target-hover');
    if (prev_bfsroot_hover) prev_bfsroot_hover.classList.remove('bfsroot-hover');
});

grid.addEventListener('click', e => {
    if (!e.target.classList.contains('cell')) return;

    const cell_classlist = e.target.classList;
    if (f_draw_walls) {
        if (!cell_classlist.contains('target') && 
        !cell_classlist.contains('bfsroot')) {
            cell_classlist.add('wall');
            cell_classlist.remove('wall-hover');
            // update_history('wall', e.target.textContent);
        }
    }
    else if (f_select_targets) {
        if (!cell_classlist.contains('wall') &&
        !cell_classlist.contains('bfsroot')) {
            cell_classlist.add('target');
            cell_classlist.remove('target-hover');
            targets += 1;
            // update_history('target', e.target.textContent);
        }
    }
    else if (f_select_bfs_root && !bfsroot) {
        if (!cell_classlist.contains('wall') &&
        !cell_classlist.contains('target')) {
            cell_classlist.add('bfsroot');
            cell_classlist.remove('bfsroot-hover');
            bfsroot = e.target;
            run_btn.disabled = false;
            select_bfs_root_btn.disabled = true;
            // update_history('bfsroot', e.target.textContent);

            /* as soon as the bfsroot is selected, 
            I set the flag to false because no other roots
            can be selected. It's unique (at least for now) */
            f_select_bfs_root = false;
        }
    }
});

function bfs() {
    let freezed_q = null;
    let freezed_visited = null;
    let freezed_targets_found = 0;
    let freezed_steps = 0;
    let bfs_freezed = false;
    return async function(f) {
        if ('f_freeze_bfs' === f) {
            bfs_freezed = true;
            return;
        }

        if ('f_unfreeze_bfs' === f) {
            bfs_freezed = false;
            return;
        }
        
        if ('f_reset_data' === f) {
            freezed_q = null;
            freezed_visited = null;
            freezed_targets_found = 0;
            freezed_steps = 0;
            return;
        }

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
        
        // Actual bfs algorithm

        const visited = freezed_visited ? freezed_visited : new Set();
        const q = freezed_q ? freezed_q : [ bfsroot ];
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
    
            if (visited.has(curr.textContent)) continue;
            visited.add(curr.textContent);
            curr.classList.add('visited');
            if (curr.classList.contains('target')) targets_found += 1;
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const x = Number(curr.textContent.split(',')[0]);
            const y = Number(curr.textContent.split(',')[1]);
            
            if (x > 0) q.push(grid.childNodes[x - 1].childNodes[y]);
            if (y < grid.childNodes[x].childNodes.length - 1) q.push(grid.childNodes[x].childNodes[y + 1]);
            if (x < grid.childNodes.length - 1) q.push(grid.childNodes[x + 1].childNodes[y]);
            if (y > 0) q.push(grid.childNodes[x].childNodes[y - 1]);
        }
        
        /* terminates 'naturally' if q.length === 0 or 
        (targets_found === targets && targets > 0) */
        if (!bfs_freezed) {
            update_res(targets > 0 && targets_found === targets, visited.size, steps);
            return true;
        }
    }
}

/* The only differences between bfs and dfs are which element
is removed from the array on each iteration and the order
in which cells are pushed into the array. */
async function dfs2() {
    if (!bfsroot) {
        console.error('Error: dfs: no bfsroot defined.');
        return;
    }
    const s = [ bfsroot ];
    const visited = new Set();
    let targets_found = 0;
    let steps = 0;
    while (s.length > 0) {
        if (targets > 0 && targets_found === targets) return;
        steps += 1;
        const curr = s.pop();
        if (curr.classList.contains('wall')) continue;
        if (visited.has(curr.textContent)) continue;
        visited.add(curr.textContent);
        curr.classList.add('visited');
        if (curr.classList.contains('target')) targets_found += 1;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const x = Number(curr.textContent.split(',')[0]);
        const y = Number(curr.textContent.split(',')[1]);
        
        if (y > 0) s.push(grid.childNodes[x].childNodes[y - 1]);
        if (x < grid.childNodes.length - 1) s.push(grid.childNodes[x + 1].childNodes[y]);
        if (y < grid.childNodes[x].childNodes.length - 1) s.push(grid.childNodes[x].childNodes[y + 1]);
        if (x > 0) s.push(grid.childNodes[x - 1].childNodes[y]);
    }
    update_res(targets > 0 && targets_found === targets, visited.size, steps);
}

function update_res(target_found, cells_visited, steps) {
    document.querySelector('#target-found').textContent = target_found;
    document.querySelector('#cells-visited').textContent = cells_visited;
    document.querySelector('#steps').textContent = steps;
}

// function update_history(_class, coordinates) {
//     history_idx += 1;
//     history.push(_class + ',' + coordinates);
//     if (history_idx >= 0) {
//         undo_btn.disabled = false;
//         redo_btn.disabled = false;
//     }
// }

// undo_btn.addEventListener('click', () => {
//     let last_move = history[history_idx];
//     let info = last_move.split(',');
//     let _class = info[0], x = info[1], y = info[2];
//     grid.childNodes[x].childNodes[y].classList.remove(_class);
// });


