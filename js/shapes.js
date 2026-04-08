// shapes.js - AI Geometric Intelligent Recognition

const canvas = document.getElementById('shapes-canvas');
const ctx = canvas.getContext('2d');
const btnClear = document.getElementById('btn-clear-shapes');
const statClass = document.getElementById('shape-stat-class');
const statConf = document.getElementById('shape-stat-conf');
const explanation = document.getElementById('shape-explanation');

let drawing = false;
let rawStroke = [];
let morphedPolygons = []; // Stores completed shapes { points: [], color: '', dash: false }

let width, height;

// ── Neural Network Visualization ─────────────────────────────────────────────────
const nnCanvas = document.getElementById('nn-canvas');
const nnCtx = nnCanvas ? nnCanvas.getContext('2d') : null;
let nnWidth = nnCanvas ? nnCanvas.width : 1160;
let nnHeight = nnCanvas ? nnCanvas.height : 220;

const nnLayers = [
    { size: 24, nodes: [] }, // Input
    { size: 16, nodes: [] }, // H1
    { size: 16, nodes: [] }, // H2
    { size: 10, nodes: [], labels: ["Line", "Circle", "Ellipse", "Rectangle", "Square", "Triangle", "Pentagon", "Hexagon", "Star", "Cylinder"] } // Output
];

function initNN() {
    if (!nnCanvas) return;
    const paddingX = 80;
    const paddingY = 20;
    const usableW = nnWidth - paddingX * 2;
    const usableH = nnHeight - paddingY * 2;
    const layerSpacing = usableW / (nnLayers.length - 1);
    
    nnLayers.forEach((layer, lIdx) => {
        const x = paddingX + lIdx * layerSpacing;
        const nodeSpacing = usableH / Math.max(1, layer.size - 1);
        for (let i = 0; i < layer.size; i++) {
            const y = paddingY + i * nodeSpacing + (usableH - (layer.size-1)*nodeSpacing)/2;
            layer.nodes.push({
                x: x, y: y,
                activation: 0, targetActivation: 0.1,
                label: layer.labels ? layer.labels[i] : null
            });
        }
    });
}

// ── Orchestration & Animation ────────────────────────────────────────────────────
let nnWaveTime = 0;
let nnWinningShape = null;

function pulseWave(shape) {
    nnWinningShape = shape;
    nnWaveTime = performance.now();
    nnLayers.forEach(l => l.nodes.forEach(n => n.targetActivation = 0.1));
}

function updateNN(time) {
    if (!nnCanvas) return;
    if (drawing) {
        nnLayers[0].nodes.forEach(n => n.targetActivation = Math.random() > 0.6 ? Math.random()*0.8 : 0.1);
        nnLayers[1].nodes.forEach(n => n.targetActivation = Math.random() > 0.8 ? Math.random()*0.4 : 0.1);
        nnLayers[2].nodes.forEach(n => n.targetActivation = 0.1);
        subOutputPulse(0.1);
        return;
    }
    
    if (nnWinningShape) {
        let elapsed = time - nnWaveTime;
        let t1 = 150, t2 = 400, t3 = 600, end = 2000;
        
        if (elapsed > 0 && elapsed < t2) nnLayers[0].nodes.forEach(n => n.targetActivation = 0.7 + Math.random()*0.3);
        else nnLayers[0].nodes.forEach(n => n.targetActivation = 0.1);
        
        if (elapsed > t1 && elapsed < t3) nnLayers[1].nodes.forEach(n => n.targetActivation = 0.6 + Math.random()*0.4);
        else nnLayers[1].nodes.forEach(n => n.targetActivation = 0.1);
        
        if (elapsed > t2 && elapsed < end) nnLayers[2].nodes.forEach(n => n.targetActivation = 0.6 + Math.random()*0.4);
        else nnLayers[2].nodes.forEach(n => n.targetActivation = 0.1);
        
        if (elapsed > t3) {
            nnLayers[3].nodes.forEach(n => {
                if (n.label === nnWinningShape) {
                    n.targetActivation = (elapsed < end) ? 1.0 : Math.max(0.1, 1 - (elapsed-end)/1500);
                } else {
                    n.targetActivation = 0.1;
                }
            });
        }
        if (elapsed > end + 2000) nnWinningShape = null;
    } else {
        nnLayers.forEach((layer, lIdx) => {
            layer.nodes.forEach((n, nIdx) => {
                n.targetActivation = 0.1 + Math.sin(time/400 + lIdx + nIdx*0.2) * 0.05;
            });
        });
    }
}

function subOutputPulse(val) {
   nnLayers[3].nodes.forEach(n => n.targetActivation = val);
}

function renderNN() {
    if (!nnCtx) return;
    nnCtx.clearRect(0, 0, nnWidth, nnHeight);
    nnCtx.lineWidth = 1.5;
    
    for (let l = 0; l < nnLayers.length - 1; l++) {
        let currentLayer = nnLayers[l];
        let nextLayer = nnLayers[l+1];
        for (let i = 0; i < currentLayer.size; i++) {
            let n1 = currentLayer.nodes[i];
            for (let j = 0; j < nextLayer.size; j++) {
                let n2 = nextLayer.nodes[j];
                let activeMix = (n1.activation + n2.activation)/2;
                if (activeMix < 0.15) continue; 
                let alpha = 0.05 + activeMix * 0.5;
                nnCtx.strokeStyle = `rgba(90, 228, 220, ${alpha})`;
                nnCtx.beginPath();
                nnCtx.moveTo(n1.x, n1.y);
                nnCtx.lineTo(n2.x, n2.y);
                nnCtx.stroke();
            }
        }
    }
    
    for (let l = 0; l < nnLayers.length; l++) {
        let layer = nnLayers[l];
        for (let i = 0; i < layer.size; i++) {
            let n = layer.nodes[i];
            n.activation += (n.targetActivation - n.activation) * 0.15;
            let glow = n.activation * 12;
            nnCtx.shadowBlur = glow;
            nnCtx.shadowColor = 'rgba(90, 228, 220, 1)';
            nnCtx.fillStyle = `rgba(232, 224, 208, ${0.2 + n.activation*0.8})`;
            nnCtx.beginPath();
            nnCtx.arc(n.x, n.y, 2.5 + n.activation*2.5, 0, Math.PI*2);
            nnCtx.fill();
            nnCtx.shadowBlur = 0;
            if (n.label) {
                nnCtx.fillStyle = `rgba(232, 224, 208, ${0.3 + n.activation*0.7})`;
                nnCtx.font = "11px 'Courier New', monospace";
                nnCtx.textAlign = "left";
                nnCtx.textBaseline = "middle";
                if (n.activation > 0.5) {
                    nnCtx.shadowBlur = Math.min(10, glow);
                    nnCtx.shadowColor = 'rgba(90, 228, 220, 0.8)';
                }
                nnCtx.fillText(n.label, n.x + 15, n.y);
                nnCtx.shadowBlur = 0;
            }
        }
    }
}

// ── State handling ───────────────────────────────────────────────────────────────
function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    render();
}
window.addEventListener('resize', resize);
setTimeout(resize, 100); // initial sizing buffer

// ── Math & Heuristics Utilities ──────────────────────────────────────────────────

function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
}

function polygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
}

function getBoundingBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        if(p.x < minX) minX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.x > maxX) maxX = p.x;
        if(p.y > maxY) maxY = p.y;
    });
    return {minX, minY, maxX, maxY, W: maxX-minX, H: maxY-minY};
}

// ── Recognition Engine ───────────────────────────────────────────────────────────

function recognizeShape(points) {
    if (points.length < 5) return {shape: "Line", conf: 100};

    let box = getBoundingBox(points);
    let diag = Math.sqrt(box.W**2 + box.H**2);
    
    // Fallback if extremely small
    if (diag < 10) return {shape: "Line", conf: 100};

    // Determine if closed
    let distEnds = distance(points[0], points[points.length-1]);
    let isClosed = distEnds < (diag * 0.25);
    
    // Filter self-intersections or overshoots conceptually
    let area = polygonArea(points);
    let boxArea = box.W * box.H;
    let fillRatio = area / (boxArea || 1);
    let ar = box.W / (box.H || 1);
    
    // Simplification for corner counting roughly
    let simplifiedLength = simplify(points, diag * 0.05).length;
    let v = isClosed ? Math.max(3, simplifiedLength - 1) : simplifiedLength;

    if (!isClosed && fillRatio < 0.2) {
        return {shape: "Line", conf: 95};
    }

    // Scoring engine
    let scores = [];
    
    function scoreMatch(f, ideal_f, vert, ideal_v, aspectRatio, ideal_ar) {
        let score = 100;
        score -= Math.abs(f - ideal_f) * 150;
        if (ideal_ar !== null) {
            let arDiff = Math.max(aspectRatio/ideal_ar, ideal_ar/aspectRatio) - 1;
            score -= arDiff * 60;
        }
        if (ideal_v !== null && vert !== null) {
            if (vert === ideal_v) score += 20;
            else score -= Math.abs(vert - ideal_v) * 10;
        }
        return score;
    }

    scores.push({shape: "Square", score: scoreMatch(fillRatio, 0.95, v, 4, ar, 1.0)});
    scores.push({shape: "Rectangle", score: scoreMatch(fillRatio, 0.95, v, 4, ar, ar) + (ar>1.25||ar<0.8 ? 15 : -15)});
    scores.push({shape: "Circle", score: scoreMatch(fillRatio, 0.785, null, null, ar, 1.0)});
    scores.push({shape: "Ellipse", score: scoreMatch(fillRatio, 0.785, null, null, ar, ar) + (ar>1.3||ar<0.75 ? 15 : -15)});
    scores.push({shape: "Hexagon", score: scoreMatch(fillRatio, 0.75, v, 6, ar, 1.0)});
    scores.push({shape: "Pentagon", score: scoreMatch(fillRatio, 0.69, v, 5, ar, 1.0)});
    scores.push({shape: "Triangle", score: scoreMatch(fillRatio, 0.5, v, 3, ar, ar)});
    scores.push({shape: "Cylinder", score: scoreMatch(fillRatio, 0.85, null, null, ar, 0.5) + (ar < 0.7 ? 20 : -20)});
    scores.push({shape: "Star", score: scoreMatch(fillRatio, 0.3, v, 10, ar, 1.0) + (fillRatio < 0.4 ? 10 : 0)});

    scores.sort((a,b) => b.score - a.score);
    
    let best = scores[0];
    let conf = Math.max(30, Math.min(99.9, best.score));
    return { shape: best.shape, conf: conf, box: box };
}

// ── Douglas Peucker ──────────────────────────────────────────────────────────────

function simplify(points, epsilon) {
    if (points.length <= 2) return points;
    let maxDist = 0, index = 0, end = points.length - 1;

    for (let i = 1; i < end; i++) {
        let d = perpendicularDistance(points[i], points[0], points[end]);
        if (d > maxDist) { maxDist = d; index = i; }
    }

    if (maxDist > epsilon) {
        let rec1 = simplify(points.slice(0, index + 1), epsilon);
        let rec2 = simplify(points.slice(index), epsilon);
        return rec1.slice(0, rec1.length - 1).concat(rec2);
    } else {
        return [points[0], points[end]];
    }
}

function perpendicularDistance(p, p1, p2) {
    let A = p.x - p1.x, B = p.y - p1.y, C = p2.x - p1.x, D = p2.y - p1.y;
    let dot = A * C + B * D, len_sq = C * C + D * D;
    let param = len_sq !== 0 ? dot / len_sq : -1;
    let xx, yy;
    if (param < 0) { xx = p1.x; yy = p1.y; }
    else if (param > 1) { xx = p2.x; yy = p2.y; }
    else { xx = p1.x + param * C; yy = p1.y + param * D; }
    let dx = p.x - xx, dy = p.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// ── Parametric Ideal Generator ───────────────────────────────────────────────────

function getIdealParametricPath(shape, minX, minY, W, H, numPoints) {
    let cx = minX + W/2;
    let cy = minY + H/2;
    let vps = [];
    
    if (shape === "Circle" || shape === "Ellipse") {
        let rx = shape === "Circle" ? Math.min(W, H)/2 : W/2;
        let ry = shape === "Circle" ? Math.min(W, H)/2 : H/2;
        for (let i=0; i<=100; i++) {
            let a = i/100 * 2 * Math.PI - Math.PI/2;
            vps.push({x: cx + rx*Math.cos(a), y: cy + ry*Math.sin(a)});
        }
    } else if (["Triangle", "Square", "Rectangle", "Pentagon", "Hexagon"].includes(shape)) {
        let n = {Triangle:3, Square:4, Rectangle:4, Pentagon:5, Hexagon:6}[shape];
        let rx = (shape === "Rectangle") ? W/2 : Math.min(W, H)/2;
        let ry = (shape === "Rectangle") ? H/2 : Math.min(W, H)/2;
        
        for(let i=0; i<=n; i++) {
            let a = i/n * 2 * Math.PI - Math.PI/2;
            if (shape === "Square" || shape === "Rectangle") a += Math.PI/4;
            vps.push({x: cx + rx*Math.cos(a), y: cy + ry*Math.sin(a)});
        }
    } else if (shape === "Star") {
        let n = 10;
        let R = Math.min(W,H)/2;
        let r = R * 0.4;
        for(let i=0; i<=n; i++) {
            let a = i/n * 2 * Math.PI - Math.PI/2;
            let rad = i%2===0 ? R : r;
            vps.push({x: cx + rad*Math.cos(a), y: cy + rad*Math.sin(a)});
        }
    } else if (shape === "Cylinder") {
        let rx = W/2, ry = Math.min(H*0.15, W/4);
        let topCy = minY + ry, botCy = minY + H - ry;
        
        for(let i=0; i<=20; i++){
            let a = Math.PI + i/20 * Math.PI; 
            vps.push({x: cx + rx*Math.cos(a), y: topCy + ry*Math.sin(a)});
        }
        vps.push({x: cx + rx, y: botCy});
        for(let i=0; i<=20; i++){
            let a = i/20 * Math.PI;
            vps.push({x: cx + rx*Math.cos(a), y: botCy + ry*Math.sin(a)});
        }
        vps.push({x: cx - rx, y: topCy});
        vps.push(vps[0]); // close loop
    } else if (shape === "Line") {
        // Find best diagonal match for line bounding box to preserve slope
        return [{x: minX, y: minY}, {x: minX+W, y: minY+H}]; // placeholder, will align
    }

    return resamplePath(vps, numPoints);
}

function resamplePath(points, n) {
    if (points.length === 0) return [];
    let I = pathLength(points) / (n - 1);
    let D = 0;
    let newpts = [points[0]];
    for (let i = 1; i < points.length; i++) {
        let d = distance(points[i - 1], points[i]);
        if (D + d >= I) {
            let qx = points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
            let qy = points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
            let q = { x: qx, y: qy };
            newpts.push(q);
            points.splice(i, 0, q);
            D = 0;
        } else {
            D += d;
        }
    }
    if (newpts.length === n - 1) newpts.push(points[points.length - 1]);
    return newpts;
}

function pathLength(points) {
    let d = 0;
    for (let i = 1; i < points.length; i++) d += distance(points[i - 1], points[i]);
    return d;
}

// Shift array to match starting point
function alignPathStart(rawPoints, idealPoints) {
    let bestOffset = 0;
    let bestDist = Infinity;
    for(let i=0; i<idealPoints.length; i+=1) {
        let d1 = distance(rawPoints[0], idealPoints[i]);
        if (d1 < bestDist) {
            bestDist = d1;
            bestOffset = i;
        }
    }
    
    let shifted = idealPoints.slice(bestOffset).concat(idealPoints.slice(0, bestOffset));
    
    // Check if reverse is better matching
    let fwdSum = 0, revSum = 0;
    let reversed = [...shifted].reverse();
    for(let i=0; i<rawPoints.length; i+=Math.floor(rawPoints.length/10)+1) {
        fwdSum += distance(rawPoints[i], shifted[i]);
        revSum += distance(rawPoints[i], reversed[i]);
    }
    
    return revSum < fwdSum ? reversed : shifted;
}

// ── Interactions & Events ────────────────────────────────────────────────────────

function onPointerDown(e) {
    drawing = true;
    rawStroke = [];
    addPoint(e);
}

function onPointerMove(e) {
    if (!drawing) return;
    addPoint(e);
    render();
}

function onPointerUp(e) {
    if (!drawing) return;
    drawing = false;
    processStroke();
}

function addPoint(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX || (e.touches && e.touches[0].clientX);
    let clientY = e.clientY || (e.touches && e.touches[0].clientY);
    rawStroke.push({
        x: clientX - rect.left,
        y: clientY - rect.top
    });
}

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

canvas.addEventListener('touchstart', onPointerDown, {passive: false});
canvas.addEventListener('touchmove', e => { e.preventDefault(); onPointerMove(e); }, {passive: false});
window.addEventListener('touchend', onPointerUp);

btnClear.addEventListener('click', () => {
    morphedPolygons = [];
    rawStroke = [];
    statClass.textContent = "—";
    statConf.textContent = "0.00%";
    explanation.textContent = "Awaiting stroke input...";
    render();
});

// ── Orchestration & Animation ────────────────────────────────────────────────────

function processStroke() {
    if (rawStroke.length < 5) return;
    
    // 1. Resample raw stroke uniformly to standard length (e.g. 100 points)
    let resampledRaw = resamplePath(rawStroke, 100);
    
    // 2. Recognize
    let result = recognizeShape(resampledRaw);
    let shape = result.shape;
    let box = result.box;
    
    statClass.textContent = shape;
    statConf.textContent = result.conf.toFixed(2) + "%";
    explanation.textContent = `> Stroke captured: ${resampledRaw.length} points
> Compute Bounding Box: ${Math.round(box.W)}x${Math.round(box.H)}
> Analyzing Fill Ratio & Vertices...
> Classification matched: ${shape}
> Morphing structural topology...`;

    // 3. Generate Ideal Path
    let ideal = [];
    if (shape === "Line") {
         // Special handling to align line with stroke terminals
         let rPts = resampledRaw;
         ideal = resamplePath([rPts[0], rPts[rPts.length-1]], 100);
    } else {
         ideal = getIdealParametricPath(shape, box.minX, box.minY, box.W, box.H, 100);
         ideal = alignPathStart(resampledRaw, ideal);
    }
    
    // 4. Animate morphing!
    let poly = {
        points: resampledRaw.map(p => ({...p})), // current animated state
        source: resampledRaw,
        target: ideal,
        progress: 0,
        shapeName: shape,
        color: `hsl(${Math.random()*60 + 150}, 75%, 65%)` // random cyan/green hue
    };
    
    morphedPolygons.push(poly);
    animateMorph(poly);
    pulseWave(shape);
    rawStroke = [];
}

function animateMorph(poly) {
    const duration = 800; // ms
    let startTime = performance.now();
    
    function step(time) {
        let t = (time - startTime) / duration;
        if (t > 1) t = 1;
        
        let easeOutQuart = 1 - Math.pow(1 - t, 4); // smooth snapping ease
        
        for (let i = 0; i < poly.points.length; i++) {
            poly.points[i].x = poly.source[i].x + (poly.target[i].x - poly.source[i].x) * easeOutQuart;
            poly.points[i].y = poly.source[i].y + (poly.target[i].y - poly.source[i].y) * easeOutQuart;
        }
        
        poly.progress = t;
        render();
        
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ── Rendering loop ───────────────────────────────────────────────────────────────

function render() {
    ctx.clearRect(0, 0, width, height);

    // Grid Background
    ctx.strokeStyle = '#1e1e1e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0; x<=width; x+=40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for(let y=0; y<=height; y+=40) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    // Draw completed & animating polygons
    morphedPolygons.forEach(poly => {
        ctx.strokeStyle = poly.color;
        ctx.lineWidth = 2 + (poly.shapeName === "Star" ? 1 : 0);
        
        // draw glowing effect if finished
        if (poly.progress === 1) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = poly.color;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.beginPath();
        ctx.moveTo(poly.points[0].x, poly.points[0].y);
        for(let i=1; i<poly.points.length; i++) ctx.lineTo(poly.points[i].x, poly.points[i].y);
        
        if (poly.shapeName !== "Line") ctx.closePath();
        ctx.stroke();
    });

    ctx.shadowBlur = 0;

    // Draw raw current stroke
    if (rawStroke.length > 0) {
        ctx.strokeStyle = 'rgba(232, 224, 208, 0.6)'; // faint cream
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(rawStroke[0].x, rawStroke[0].y);
        for (let i = 1; i < rawStroke.length; i++) {
            ctx.lineTo(rawStroke[i].x, rawStroke[i].y);
        }
        ctx.stroke();
    }
}

// ── Initialization Loop ──────────────────────────────────────────────────────────
initNN();
function mainLoop(time) {
    updateNN(time);
    renderNN();
    requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);
