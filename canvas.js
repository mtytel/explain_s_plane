function make_s_plane_canvas() {

var $ = jQuery;
var splane = document.getElementById('s-plane');
var $splane = $(splane);
var splane_context = splane.getContext('2d');
var MAX_POLES = 5;
var MAX_ZEROS = 5;
var points = [];
var poles = [];
var zeros = [];
var dragging_point = null;
var RADIUS = 7;

var pole_color = 'green';
var zero_color = 'black';
var dragging_color = 'blue';

var w = splane.width;
var h = splane.height;
var k = 0.4; // we will think of the plane as 2k by 2k

/* INITIAL CANVAS SETUP *********************/

setInterval(update_data, 10);

draw_axes();

$('#filter_sweep').on('click', filter_sweep);
$('#butterworth').on('click', butterworth);

/* CANVAS EVENTS ***************************/

$splane.on('mousedown', function(ev) {
    var x = ev.offsetX - w/2;
    var y = ev.offsetY - h/2;
    var point = touching_point(x, y);
    if (point === null) {
        // create new points
        if (ev.shiftKey)
            add_zero(x, y);
        else
            add_pole(x, y);
    }
    else {
      dragging_point = point;
      // enter dragging mode
      $splane.on('mousemove', throttled_drag);
      $splane.on('mouseup', end_drag);
    }
});

var drag = function(ev) {
    if (!dragging_point) {
        return;
    }
    dragging_point[0] = ev.offsetX - w/2;
    dragging_point[1] = ev.offsetY - h/2;
    _redraw_all_points();
};
var throttled_drag = _.throttle(drag, 10);
var end_drag = function(ev) {
    dragging_point = null;
    _redraw_all_points();
    $splane.off('mousemove');
};

function update_data() {
    var ps = [];
    var zs = [];
    var rs = [];
    for (var i = 0; i < poles.length; i++) {
        var x = poles[i][0];
        var y = poles[i][1];
        ps.push(complex(x/(w/2)*k, y/(h/2)*k));
        ps.push(complex(x/(w/2)*k, -y/(h/2)*k));
        rs.push(1);
        rs.push(1);
    }
    for (var i = 0; i < zeros.length; i++) {
        var x = zeros[i][0];
        var y = zeros[i][1];
        zs.push(complex(x/(w/2)*k, y/(h/2)*k));
        zs.push(complex(x/(w/2)*k, -y/(h/2)*k));
    }
    updateFilterWithPolesAndZeros(ps, zs);
}

/* PRESET MOVEMENTS / DEMOS *****************/

function filter_sweep() {
    points = [];
    poles = [];
    zeros = [];
    _redraw_all_points();
    add_pole(-.01*w/2, .9*h/2);
    _redraw_all_points();
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
        _redraw_all_points();
    }
}

function butterworth() {
    points = [];
    poles = [];
    zeros = [];
    _redraw_all_points();
    var r = 0.3 * k;
    add_pole(r * -0.259, r * 0.966);
    add_pole(r * -0.707, r * 0.707);
    add_pole(r * -0.966, r * 0.259);
    _redraw_all_points();
}

/* POINT FUNCTIONS ***************************/

function add_zero(x, y) {
    if (zeros.length >= MAX_ZEROS) {
        return false;
    }
    var point = [x, y];
    zeros.push(point);
    points.push(point);
    _redraw_all_points();
}

function add_pole(x, y) {
    if (poles.length >= MAX_POLES) {
        return false;
    }
    var point = [x, y];
    poles.push(point);
    points.push(point);
    _redraw_all_points();
}

function within_radius(x1, y1, x2, y2, r) {
  return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) <= r * r;
}

function touching_point(x, y) {
    // if x, y lie within a point's circle, returns a copy of that point. else returns null
    for (var i = 0; i < points.length; i++) {
        var px = points[i][0];
        var py = points[i][1];
        if (within_radius(x, y, px, py, RADIUS) || within_radius(x, y, px, -py, RADIUS)) {
            return points[i];
        }
    }
    return null;
}

function get_point_pair(point) {
    // given one point, returns a copy of that point and its corresponding point
    if (!point) {
        return [];
    }
    var x = point[0];
    var y = point[1];
    var r = point[2];
    return [[x, y, r], [x, -y, r]];
}

/* CANVAS FUNCTIONS *************************/

function erase_circle_pair(x, y) { 
    if (!remove_point_pair(x,y)) {
        return;
    }
    _redraw_all_points();
}

function move_point_pair(points, x, y) {
    if (points.length !== 2) {
        return;
    }
    var oldx = points[0][0];
    var oldy = points[0][1];
    var oldIsPole = points[0][2];
    if (!remove_point_pair(oldx, oldy)) {
        return;
    }
    if (!add_point(x, y, oldIsPole)) {
        return;
    }
    _redraw_all_points();
}

function recolor_points(ps, color) {
    for (var i = 0; i < ps.length; i++) {
        var px = ps[i][0];
        var py = ps[i][1];
        _circle(px, py, color);
        _circle(px, -py, color);
    }
}

function _redraw_all_points() {
    _reset_canvas();
    draw_axes();
    for (var i = 0; i < poles.length; i++) {
        var color = pole_color;
        if (poles[i] === dragging_point)
          color = dragging_color;
        _circle(poles[i][0], poles[i][1], color);
        _circle(poles[i][0], -poles[i][1], color);
    }
    for (var i = 0; i < zeros.length; i++) {
        var color = zero_color;
        if (zeros[i] === dragging_point)
          color = dragging_color;
        _circle(zeros[i][0], zeros[i][1], color);
        _circle(zeros[i][0], -zeros[i][1], color);
    }
}

function _circle(x, y, color) {
    var context = splane_context;
    context.beginPath();
    context.arc(x + w/2, y + h/2, RADIUS, 0, 2 * Math.PI, false);
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



