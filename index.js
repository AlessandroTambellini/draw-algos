/*
 * 
 *  HTML elements
 */

const grid = document.querySelector('#grid');

const btns_container = document.querySelector('#btns-container');
const clear_btn = document.querySelector('#clear-btn');
const rubber_btn = document.querySelector('#rubber-btn');
const draw_walls_btn = document.querySelector('#draw-walls-btn');
const select_targets_btn = document.querySelector('#select-targets-btn');
const select_root_btn = document.querySelector('#select-root');
const run_btn = document.querySelector('#run-btn');
const stop_btn = document.querySelector('#stop-btn');

const step_pause_input = document.querySelector('#step-pause');
document.querySelector('form').addEventListener('submit', e => e.preventDefault());

const res_target_found = document.querySelector('#target-found');
const res_cells_visited = document.querySelector('#cells-visited');
const res_steps = document.querySelector('#steps');

/*
* 
*   Algorithms
*/

const BFS = 0;
const DFS = 1;
const WHATEVER = 2;

class Bfs {
    // ds stands for data structure
    #freezed_ds = null;
    #freezed_visited = null;
    #freezed_targets_found = 0;
    #freezed_steps = 0;
    #f_freeze = false;
    #step_pause = 0;

    set_f_freeze(state) {
        this.#f_freeze = state;
    }

    set_step_pause(step_pause) {
        this.#step_pause = step_pause;
    }
    
    reset_data() {
        this.#freezed_ds = null;
        this.#freezed_visited = null;
        this.#freezed_targets_found = 0;
        this.#freezed_steps = 0;
    }

    async run() {
        if (!root) {
            /* I want the algos API to be independent from the UI 
            (more precisely, the HTML). So, I do not assume the root
            to be defined when bfs() is called, even though it cannot
            happen by 'following the UI'.
            If, for instance, I enter the inspection panel of the browser 
            and I remove the disabled attribute from the stop button,
            I can click 2 times on this last button to call
            bfs() without root being defined. */
            console.error('Error: no root selected.');
            return 0;
        }
        
        const visited = this.#freezed_visited ? this.#freezed_visited : new Set();
        // It's a queue, but I call it ds for every algorithm
        const ds = this.#freezed_ds ? this.#freezed_ds : [ root ];
        let targets_found = this.#freezed_targets_found;
        let steps = this.#freezed_steps;
        while (ds.length > 0) 
        {
            if (this.#f_freeze) {
                this.#freezed_ds = ds;
                this.#freezed_visited = visited;
                this.#freezed_targets_found = targets_found;
                this.#freezed_steps = steps;
                break;
            }
            
            if (targets > 0 && targets_found === targets) break;
            
            steps += 1;
            const curr = ds.shift();
            if (curr.classList.contains('wall')) continue;
            
            if (visited.has(curr.textContent)) continue;
            visited.add(curr.textContent);
            curr.classList.add('visited');
            if (curr.classList.contains('target')) {
                targets_found += 1;
                curr.classList.add('target-found');
            }
            await new Promise(resolve => setTimeout(resolve, this.#step_pause));
            
            const x = Number(curr.textContent.split(',')[0]);
            const y = Number(curr.textContent.split(',')[1]);
            
            if (x > 0) ds.push(grid.childNodes[x - 1].childNodes[y]);
            if (y < grid.childNodes[x].childNodes.length - 1) ds.push(grid.childNodes[x].childNodes[y + 1]);
            if (x < grid.childNodes.length - 1) ds.push(grid.childNodes[x + 1].childNodes[y]);
            if (y > 0) ds.push(grid.childNodes[x].childNodes[y - 1]);
        }
        
        /* if the algo terminated without being freezed */
        if (!this.#f_freeze) {
            update_res(targets > 0 && targets_found === targets, visited.size, steps);
            return 1;
        } else {
            return 0;
        }
    }
}

class Dfs {
    #freezed_ds = null;
    #freezed_visited = null;
    #freezed_targets_found = 0;
    #freezed_steps = 0;
    #f_freeze = false;
    #step_pause = 0;
    
    set_f_freeze(state) {
        this.#f_freeze = state;
    }

    set_step_pause(step_pause) {
        this.#step_pause = step_pause;
    }
    
    reset_data() {
        this.#freezed_ds = null;
        this.#freezed_visited = null;
        this.#freezed_targets_found = 0;
        this.#freezed_steps = 0;
    }

    /* There are only 2 differences between bfs and dfs:
    - which element is removed from the array on each iteration
    (first or last)
    - the order in which cells are pushed to the array
    to have the order top, right, bottom, left */
    async run() {
        if (!root) {
            console.error('Error: dfs: no root defined.');
            return 0;
        }
        const visited = this.#freezed_visited ? this.#freezed_visited : new Set();
        const ds = this.#freezed_ds ? this.#freezed_ds : [ root ];
        let targets_found = this.#freezed_targets_found;
        let steps = this.#freezed_steps;
        while (ds.length > 0) {
            if (this.#f_freeze) {
                this.#freezed_ds = ds;
                this.#freezed_visited = visited;
                this.#freezed_targets_found = targets_found;
                this.#freezed_steps = steps;
                break;
            }
            if (targets > 0 && targets_found === targets) break;
            steps += 1;
            const curr = ds.pop();
            if (curr.classList.contains('wall')) continue;
            if (visited.has(curr.textContent)) continue;
            visited.add(curr.textContent);
            curr.classList.add('visited');
            if (curr.classList.contains('target')) {
                targets_found += 1;
                curr.classList.add('target-found');
            }
            await new Promise(resolve => setTimeout(resolve, this.#step_pause));
            
            const x = Number(curr.textContent.split(',')[0]);
            const y = Number(curr.textContent.split(',')[1]);
            
            if (y > 0) ds.push(grid.childNodes[x].childNodes[y - 1]);
            if (x < grid.childNodes.length - 1) ds.push(grid.childNodes[x + 1].childNodes[y]);
            if (y < grid.childNodes[x].childNodes.length - 1) ds.push(grid.childNodes[x].childNodes[y + 1]);
            if (x > 0) ds.push(grid.childNodes[x - 1].childNodes[y]);
        }
        if (!this.#f_freeze) {
            update_res(targets > 0 && targets_found === targets, visited.size, steps);
            return 1;
        } else {
            return 0;
        }
    }
}

class Whatever {

}

/*
 * 
 *  Global vars/flags 
 */

let algo = null;
let root = null;
let targets = 0;

let f_clear = true;
let f_rubber = false;
let f_draw_walls = false;
let f_select_targets = false;
let f_select_root = false;
let f_run = true;
let f_stop = true;

let prev_rubber_hover = null;
let prev_wall_hover = null;
let prev_target_hover = null;
let prev_root_hover = null;

let is_stop = true;

let leftBtn_down = false;

/*
 * 
 *  App Logic
 */

let cells_per_row = -1;
if (window.innerWidth <= 430 /* iPhone 14 Pro Max */) cells_per_row = 10;
else if (window.innerWidth <= 768 /* iPad Mini */) cells_per_row = 15;
else cells_per_row = 20;
for (let i = 0; i < cells_per_row; i++) 
{
    const row = document.createElement('div');
    row.classList.add('row');

    for (let j = 0; j < cells_per_row; j++) 
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
document.addEventListener('mousedown', e => {
    // 0 is the left button
    if (e.button === 0) leftBtn_down = true;
});
document.addEventListener('mouseup', () => leftBtn_down = false);

clear_btn.addEventListener('click', () => 
{
    if (!f_clear) return;
    run_btn.disabled = true;
    run_btn.textContent = 'run';
    select_root_btn.disabled = false;
    
    f_rubber = f_draw_walls = f_select_targets = f_select_root = false;

    grid.childNodes.forEach(row => {
        row.childNodes.forEach(cell => cell.className = 'cell'); 
    });
    root = null;
    targets = 0;

    draw_walls_btn.disabled = false;
    select_targets_btn.disabled = false;
});

rubber_btn.addEventListener('click', () => 
{
    f_draw_walls = f_select_targets = f_select_root = false;
    f_rubber = true;
});

draw_walls_btn.addEventListener('click', () => 
{
    f_rubber = f_select_targets = f_select_root = false;
    f_draw_walls = true;
});

select_targets_btn.addEventListener('click', () => 
{
    f_rubber = f_draw_walls = f_select_root = false;
    f_select_targets = true;
});

select_root_btn.addEventListener('click', () => 
{
    f_rubber = f_draw_walls = f_select_targets = false;
    if (!root) f_select_root = true;
    else console.error('Error: select_root_btn: bfs root already selected.');
});

function run_btn_handler() {
    // I use a clojure to manage the local flag 'is_run'
    let is_run = true;
    return async function() {
        if (!f_run) return;
        if (is_run)
        {
            f_run = false; 
            f_clear = false;
            /* The only condition necessary to run the algo,
            is to have the root selected. 
            The target is not needed because 
            I may want to just visualize the algorithmic pattern. 
            Same reason for why walls are not needed. */
            if (!root) {
                document.querySelector('#err-msg').textContent = 'Error: no root selected.';
                return;
            }
    
            f_rubber = f_draw_walls = f_select_targets = false;
            
            btns_container.childNodes.forEach(btn => btn.disabled = true);
            stop_btn.disabled = false;
            run_btn.textContent = 'reset';
            
            let choosen_algo = -1;
            document.querySelectorAll('.algo').forEach(input => {
                if (input.checked) choosen_algo = Number(input.value);
            });
            const step_pause = step_pause_input.value;

            switch (choosen_algo) {
                case BFS:
                    algo = new Bfs();
                    break;
                case DFS:
                    algo = new Dfs();
                    break;
                    // case WHATEVER:
                    //     algo = new Whatever();
                    //     break;
                default:
                    console.error('Error: the algorithm specified is not valid.');
                    break;
            }
            algo.set_step_pause(step_pause);
            is_run = false;
            f_run = true;
            const res = await algo.run();
            if (res) {
                stop_btn.disabled = true;
                clear_btn.disabled = run_btn.disabled = false;
            }
        }
        else
        {
            f_run = false;
            run_btn.textContent = 'run';
            stop_btn.textContent = 'stop';
            stop_btn.disabled = true;
            grid.childNodes.forEach(row => {
                row.childNodes.forEach(cell => {
                    cell.classList.remove('visited');
                    cell.classList.remove('target-found');
                });
            });

            clear_btn.disabled = rubber_btn.disabled = 
                draw_walls_btn.disabled = select_targets_btn.disabled 
                = false;

            algo.reset_data();
            algo.set_f_freeze(false);

            is_stop = true;
            is_run = true;
            f_clear = true;
            f_run = true;
        }
    }
}

run_btn.addEventListener('click', run_btn_handler());

stop_btn.addEventListener('click', async () => {
    if (!f_stop) return;
    if (is_stop) {
        f_stop = false;
        stop_btn.textContent = 'resume';
        run_btn.disabled = false;
        algo.set_f_freeze(true);
        is_stop = false;
        f_stop = true;
    } else {
        f_stop = false;
        run_btn.disabled = true;
        stop_btn.textContent = 'stop';
        algo.set_f_freeze(false);
        is_stop = true;
        f_stop = true;
        const res = await algo.run();
        if (res) {
            stop_btn.disabled = true;
            run_btn.disabled = false;
        }
    }
});

/* 
Note 1: the mouseover event listener is added to the grid
and not to every single cell because I think it consumes less resources.
p.s. I do not know if the browser does some kind of optimization in this case. 

Note 2: before adding a class to an element,
I do not check if the class is already present,
because in that case the add() method simply does not do anything.

Note 3: It's used mouseover and not mousemove because 
I want this callback function to be called 
for every child-most node hovered (a cell in this case). 
But, not for every single movement inside a cell. */
grid.addEventListener('mouseover', e => 
{
    const cell_classlist = e.target.classList;

    /* the grid container coincides with cells 
    but, I do not want to assume that. */
    if (!e.target.classList.contains('cell')) return;

    if (f_rubber) 
    {
        if (prev_rubber_hover) {
            prev_rubber_hover.classList.remove('rubber-hover');
            prev_root_hover = null;
        }
        if (cell_classlist.length > 1) {
            cell_classlist.add('rubber-hover');
            prev_rubber_hover = e.target;
        }
    } 
    
    if (cell_classlist.length > 1) return;
    
    if (f_draw_walls) 
    {
        if (prev_wall_hover) prev_wall_hover.classList.remove('wall-hover');
        cell_classlist.add('wall-hover');
        prev_wall_hover = e.target;
        if (leftBtn_down) {
            if (e.fromElement.classList.contains('cell') && 
            e.fromElement.classList.length === 1) {
                e.fromElement.classList.add('wall');
            }
            cell_classlist.add('wall');
        }
    }
    else if (f_select_targets) 
    {
        if (prev_target_hover) prev_target_hover.classList.remove('target-hover');
        cell_classlist.add('target-hover');
        prev_target_hover = e.target;
    }
    else if (f_select_root && !root) 
    {
        if (prev_root_hover) prev_root_hover.classList.remove('root-hover');
        cell_classlist.add('root-hover');
        prev_root_hover = e.target;
    }
});

grid.addEventListener('mouseleave', e => {
    if (prev_rubber_hover) {
        prev_rubber_hover.classList.remove('rubber-hover');
        prev_rubber_hover = null;
    }
    else if (prev_wall_hover) {
        prev_wall_hover.classList.remove('wall-hover');
        prev_wall_hover = null;
    }
    else if (prev_target_hover) {
        prev_target_hover.classList.remove('target-hover');
        prev_target_hover = null;
    } 
    else if (prev_root_hover) {
        prev_root_hover.classList.remove('root-hover');
        prev_root_hover = null;
    }
});

grid.addEventListener('click', e => 
{
    const cell_classlist = e.target.classList;
    if (!cell_classlist.contains('cell')) return;

    /* if there is a hover class (e.g. wall-hover), 
    it means the cell is empty.
    So, I can safely color it. */
    if (f_rubber && cell_classlist.contains('rubber-hover')) 
    {
        if (cell_classlist.contains('root')) {
            root = null;
            run_btn.disabled = true;
            select_root_btn.disabled = false
        }
        else if (cell_classlist.contains('target')) {
            targets -= 1;
        }
        e.target.className = 'cell';
    }
    else if (f_draw_walls && cell_classlist.contains('wall-hover'))
    {
        cell_classlist.add('wall');
        cell_classlist.remove('wall-hover');
    }
    else if (f_select_targets && cell_classlist.contains('target-hover')) 
    {
        cell_classlist.remove('target-hover');
        cell_classlist.add('target');
        targets += 1;
    }
    else if (f_select_root && cell_classlist.contains('root-hover') && !root) 
    {
        cell_classlist.add('root');
        cell_classlist.remove('root-hover');
        root = e.target;
        run_btn.disabled = false;
        select_root_btn.disabled = true;

        /* as soon as the root is selected, 
        I set the flag to false because no other roots
        can be selected. It's unique */
        f_select_root = false;
    }
});

function update_res(target_found, cells_visited, steps) {
    res_target_found.textContent = target_found;
    res_cells_visited.textContent = cells_visited;
    res_steps.textContent = steps;
}
