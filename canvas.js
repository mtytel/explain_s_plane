function make_s_plane_canvas() {

var $ = jQuery;
var splane = document.getElementById('s-plane');
var $splane = $(splane);
var splane_context = splane.getContext('2d');
var poles = [];
window.poles = poles;
var MAX_POLES = 10;
var RADIUS = 7;
var dragging = false;
var dragging_poles = [];

var w = splane.width;
var h = splane.height;
var k = 0.4; // we will think of the plane as 2 x 2 

setInterval(update_data, 10);

draw_axes();

$splane.on('mousedown', function(ev) {
    var x = ev.offsetX - w/2;
    var y = ev.offsetY - h/2;
    var touching = touching_pole(x,y);
    if (touching === null) {
        draw_circle_pair(x, y, 'green');
    } else {
        recolor_poles(touching, 'blue');
        dragging = true;
        dragging_poles = touching;
    }
});

var omm = function(ev) {
    if (dragging) {
        var x = ev.offsetX - w/2;
        var y = ev.offsetY - h/2;
        move_pole_pair(dragging_poles, x, y);
        dragging_poles = [[x,y],[x,-y]];
    }
};
var on_mouse_move = _.throttle(omm, 10);
$splane.on('mousemove', on_mouse_move);

$splane.on('mouseup', function(ev) {
    recolor_poles(dragging_poles, 'green');
    dragging = false;
    dragging_poles = [];
});

function update_data() {
    if (poles.length === 0) {
        return;
    }
    var ps = [];
    for (var i = 0; i < poles.length; i++) {
        var x = poles[i][0];
        var y = poles[i][1];
        ps.push(complex(x/(w/2)*k, y/(h/2)*k));
    }
    updateFilterWithPoles(ps);
}

function add_pole_pair(x, y) {
    if (poles.length > MAX_POLES - 2) {
        return false;
    }
    if (pole_index(x,y) !== -1) {
        return false;
    }
    poles.push([x,y]);
    poles.push([x,-y]);
    return true;
}

function remove_pole_pair(x, y) {
    var i = pole_index(x,y);
    if (i === -1) {
        return false;
    }
    poles.splice(i,1);
    var i = pole_index(x,-y);
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
    // if x, y lie within a pole's circle, returns a copy of that pole and its pair.  else returns null
    var i;
    for (i = 0; i < poles.length; i++) {
        var px = poles[i][0];
        var py = poles[i][1];
        if (Math.abs(px - x) <= RADIUS && Math.abs(py - y) <= RADIUS) {
            return [[px,py], [px,-py]];
        }
    }
    return null;
}

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
    if (!remove_pole_pair(oldx, oldy)) {
        return;
    }
    if (!add_pole_pair(x, y)) {
        return;
    }
    _redraw_all_poles();
}

function recolor_poles(poles, color) {
    for (var i = 0; i < poles.length; i++) {
        var px = poles[i][0];
        var py = poles[i][1];
        _circle(px, py, color);
        _circle(px, -py, color);
    }
}

function _redraw_all_poles() {
    _reset_canvas();
    draw_axes();
    for (var i = 0; i < poles.length; i++) {
        _circle(poles[i][0], poles[i][1], 'green');
    }
    recolor_poles(dragging_poles, 'blue');
}

function _circle(x, y, color) {
    var r = RADIUS;
    if (color === 'white') {
        r += .1*r;
    }
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



