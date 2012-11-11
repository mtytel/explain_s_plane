function make_s_plane_canvas() {

var $ = jQuery;
var splane = document.getElementById('s-plane');
var $splane = $(splane);
var splane_context = splane.getContext('2d');
var poles = []; // each pole is of the form [x, y, r]
window.poles = poles;
var MAX_POLES = 10;
var RADIUS = 7;
var dragging_poles = [];
var resizing_pole = null;

var w = splane.width;
var h = splane.height;
var k = 0.4; // we will think of the plane as 2k by 2k

/* INITIAL CANVAS SETUP *********************/

setInterval(update_data, 10);

draw_axes();

$('#filter_sweep').on('click', filter_sweep);

/* CANVAS EVENTS ***************************/

$splane.on('mousedown', function(ev) {
    var x = ev.offsetX - w/2;
    var y = ev.offsetY - h/2;
    var pole = touching_pole(x,y);
    if (pole === null) {
        // create new poles
        draw_circle_pair(x, y, 'green');
        return;
    }
    var touching = get_pole_pair(pole);
    if (ev.shiftKey) {
        // enter resizing mode
        recolor_poles(touching, 'brown');
        resizing_pole = pole;
        $splane.on('mousemove', throttled_resize);
        $splane.on('mouseup', end_resize);
        return;
    }
    // enter dragging mode
    recolor_poles(touching, 'blue');
    dragging_poles = touching;
    $splane.on('mousemove', throttled_drag);
    $splane.on('mouseup', end_drag);
});

var drag = function(ev) {
    if (dragging_poles.length === 0) {
        return;
    }
    var x = ev.offsetX - w/2;
    var y = ev.offsetY - h/2;
    var r = dragging_poles[0][2]; 
    move_pole_pair(dragging_poles, x, y);
    dragging_poles = [[x,y,r],[x,-y,r]];
};
var throttled_drag = _.throttle(drag, 10);
var end_drag = function(ev) {
    recolor_poles(dragging_poles, 'green');
    dragging_poles = [];
    $splane.off('mousemove');
};

var resize = function(ev) {
    var x = ev.offsetX - w/2;
    var y = ev.offsetY - h/2;
    var px = resizing_pole[0];
    var py = resizing_pole[1];
    var pr = resizing_pole[2];
    var d = Math.sqrt( Math.pow(px-x,2) + Math.pow(py-y,2) );
    if ( d < pr ) {
        return;
    }
    var r = d * .5;
    resizing_pole[2] = r;
    resize_pole_pair(get_pole_pair(resizing_pole), r);
};
var throttled_resize = _.throttle(resize, 10);
var end_resize = function(ev) {
    recolor_poles(get_pole_pair(resizing_pole), 'green');
    resizing_pole = null;
    $splane.off('mousemove');
};


function update_data() {
    if (poles.length === 0) {
        return;
    }
    var ps = [];
    var rs = [];
    for (var i = 0; i < poles.length; i++) {
        var x = poles[i][0];
        var y = poles[i][1];
        rs.push(poles[i][2] / RADIUS);
        ps.push(complex(x/(w/2)*k, y/(h/2)*k));
    }
    updateFilterWithPoles(ps, rs);
}

/* PRESET MOVEMENTS / DEMOS *****************/

function filter_sweep() {
    poles = [];
    _redraw_all_poles();
    poles = [[-.01*w/2, .9*h/2, RADIUS], [-.01*w/2, -.9*h/2, RADIUS]];
    _redraw_all_poles();
    var i = 0;
    
    loop();

    function loop() {
        if (i > 185) {
            return;
        }
        shift_poles();
        i++;
        setTimeout(loop, 50);
    }

    function shift_poles() {
        poles[0][1] -= .01*h/2;
        poles[1][1] = -poles[0][1];
        _redraw_all_poles();
    }
}

/* POLE FUNCTIONS ***************************/

function add_pole_pair(x, y, r) {
    if (poles.length > MAX_POLES - 2) {
        return false;
    }
    if (pole_index(x,y) !== -1) {
        return false;
    }
    poles.push([x,y, r || RADIUS]);
    poles.push([x,-y, r || RADIUS]);
    return true;
}

function remove_pole_pair(x, y) {
    var i = pole_index(x,y);
    if (i === -1) {
        return false;
    }
    poles.splice(i,1);
    var i = pole_index(x, -y);
    if (i === -1) {
        return false;
    }
    poles.splice(i,1);
    return true;
}

function pole_index(x, y) {
    var i;
    for (i = 0; i < poles.length; i++) {
        var pole = poles[i];
        if (pole[0] === x && pole[1] === y) {
            return i;
        }
    }
    return -1;  
}

function touching_pole(x, y) {
    // if x, y lie within a pole's circle, returns a copy of that pole. else returns null
    for (var i = 0; i < poles.length; i++) {
        var px = poles[i][0];
        var py = poles[i][1];
        var pr = poles[i][2];
        if (Math.abs(px - x) <= pr && Math.abs(py - y) <= pr) {
            return [px, py, pr];;
        }
    }
    return null;
}

function get_pole_pair(pole) {
    // given one pole, returns a copy of that pole and its corresponding pole
    if (!pole) {
        return [];
    }
    var x = pole[0];
    var y = pole[1];
    var r = pole[2];
    return [[x, y, r], [x, -y, r]];
}

/* CANVAS FUNCTIONS *************************/

function draw_circle_pair(x, y, color) {
    if (!add_pole_pair(x,y)) {
        return;
    }
    _redraw_all_poles();
}

function erase_circle_pair(x, y) { 
    if (!remove_pole_pair(x,y)) {
        return;
    }
    _redraw_all_poles();
}

function move_pole_pair(poles, x, y) {
    if (poles.length !== 2) {
        return;
    }
    var oldx = poles[0][0];
    var oldy = poles[0][1];
    var oldr = poles[0][2];
    if (!remove_pole_pair(oldx, oldy)) {
        return;
    }
    if (!add_pole_pair(x, y, oldr)) {
        return;
    }
    _redraw_all_poles();
}

function resize_pole_pair(ps, r) {
    if (ps.length !== 2) {
        return;
    }
    var i = pole_index(ps[0][0], ps[0][1]);
    poles[i][2] = r;
    var i = pole_index(ps[1][0], ps[1][1]);
    poles[i][2] = r;
    _redraw_all_poles();
}

function recolor_poles(poles, color) {
    for (var i = 0; i < poles.length; i++) {
        var px = poles[i][0];
        var py = poles[i][1];
        var pr = poles[i][2];
        _circle(px, py, color, pr);
        _circle(px, -py, color, pr);
    }
}

function _redraw_all_poles() {
    _reset_canvas();
    draw_axes();
    for (var i = 0; i < poles.length; i++) {
        _circle(poles[i][0], poles[i][1], 'green', poles[i][2]);
    }
    recolor_poles(dragging_poles, 'blue');
    recolor_poles(get_pole_pair(resizing_pole), 'brown');
}

function _circle(x, y, color, r) {
    var context = splane_context;
    context.beginPath();
    context.arc(x + w/2, y + h/2, r, 0, 2 * Math.PI, false);
    context.fillStyle = color;
    context.fill();
}

function _reset_canvas() {
    splane_context.fillStyle = 'white';
    splane_context.fillRect(0,0,w,h);
}

function draw_axes() {
    splane_context.beginPath();
    splane_context.moveTo(w/2, 0);
    splane_context.lineTo(w/2, h);
    splane_context.closePath();
    splane_context.lineWidth = 1;
    splane_context.strokeStyle = 'black';
    splane_context.stroke();

    splane_context.beginPath();
    splane_context.moveTo(0, h/2);
    splane_context.lineTo(w, h/2);
    splane_context.closePath();
    splane_context.stroke();
    
    splane_context.fillStyle = 'black';
    splane_context.fillText('gain', .95*w, .45*h);
    splane_context.fillText('frequency', .55*w, .05*h);
}

}



