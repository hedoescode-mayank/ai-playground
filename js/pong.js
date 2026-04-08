// pong.js - AI Predictive Pong Section

const canvas = document.getElementById('pong-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('pong-overlay');
const statVel = document.getElementById('pong-stat-vel');
const statIntercept = document.getElementById('pong-stat-intercept');
const explanation = document.getElementById('pong-explanation');
const scorePlayerEl = document.getElementById('pong-score-player');
const scoreAiEl = document.getElementById('pong-score-ai');

let width = canvas.width;
let height = canvas.height;

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = { player: 0, ai: 0 };
let lastTime = 0;

// Entities
const PADDLE_W = 10;
const PADDLE_H = 80;
const PADDLE_SPEED = 300; 

const ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 6, speed: 450 };
const player = { x: 20, y: height/2 - PADDLE_H/2, w: PADDLE_W, h: PADDLE_H, vy: 0 };
const ai = { x: width - 20 - PADDLE_W, y: height/2 - PADDLE_H/2, w: PADDLE_W, h: PADDLE_H, vy: 0, targetY: height/2 };

// Input
const keys = { w: false, s: false, ArrowUp: false, ArrowDown: false };

// Prediction
let trajectory = [];
let predictedY = null;

function init() {
  resetBall();
  
  window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key === ' ' && gameState === 'START') startGame();
    
    // Support playing with arrow keys gracefully (prevent scroll)
    if (['ArrowUp', 'ArrowDown', ' '].includes(e.key) && document.activeElement === canvas) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
  });

  overlay.addEventListener('click', () => {
    if (gameState === 'START') startGame();
  });
  canvas.addEventListener('click', () => canvas.focus());
  
  requestAnimationFrame(loop);
}

function resetBall() {
  ball.x = width / 2;
  ball.y = height / 2;
  let angle = (Math.random() * Math.PI/2) - Math.PI/4;
  let dir = Math.random() > 0.5 ? 1 : -1;
  ball.vx = Math.cos(angle) * ball.speed * dir;
  ball.vy = Math.sin(angle) * ball.speed;
  
  updatePrediction();
}

function startGame() {
  gameState = 'PLAYING';
  overlay.style.display = 'none';
  score.player = 0;
  score.ai = 0;
  updateScore();
  resetBall();
  lastTime = performance.now();
  canvas.focus();
}

function updatePrediction() {
  trajectory = [];
  predictedY = null;

  if (ball.vx <= 0) {
    explanation.textContent = "> Target moving away\n> Retreating to origin point\n> Engine standby...";
    ai.targetY = height / 2;
    statIntercept.textContent = "--";
    return;
  }

  let simX = ball.x;
  let simY = ball.y;
  let simVx = ball.vx;
  let simVy = ball.vy;

  let steps = 0;
  trajectory.push({x: simX, y: simY});

  let explText = `> Calculating trajectory\n> Raycasting geometry...\n`;

  // Raycast to find exact intercept
  while (simX < ai.x && steps < 10) {
    let tX = (ai.x - ball.radius - simX) / simVx; 
    
    let tY = Infinity;
    if (simVy > 0) tY = (height - ball.radius - simY) / simVy;
    else if (simVy < 0) tY = (ball.radius - simY) / simVy;

    let t = Math.min(tX, tY);
    
    simX += simVx * t;
    simY += simVy * t;
    trajectory.push({x: simX, y: simY});

    if (t === tX || Math.abs(tX - tY) < 0.001) {
      predictedY = simY;
      explText += `> Direct intercept established\n> Coordinates Y: ${Math.round(simY)}\n> Activating servos...`;
      break;
    } else {
      simVy = -simVy;
      explText += `> Wall bounce detected\n> Recomputing vector...\n`;
    }
    steps++;
  }

  if (predictedY !== null) {
    ai.targetY = predictedY;
    statIntercept.textContent = `${Math.round(ai.targetY)}`;
    explanation.textContent = explText;
  }
}

function updateScore() {
  scorePlayerEl.textContent = score.player;
  scoreAiEl.textContent = score.ai;
}

function loop(time) {
  let dt = (time - lastTime) / 1000;
  if (dt > 0.1) dt = 0.1;
  lastTime = time;

  if (gameState === 'PLAYING') {
    update(dt);
  } else {
      // Idle animation when not playing
      ai.y = height/2 - PADDLE_H/2 + Math.sin(time/500)*20;
      player.y = height/2 - PADDLE_H/2 + Math.cos(time/500)*20;
  }
  
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  player.vy = 0;
  if (keys.w || keys.ArrowUp) player.vy = -PADDLE_SPEED;
  if (keys.s || keys.ArrowDown) player.vy = PADDLE_SPEED;
  
  player.y += player.vy * dt;
  if (player.y < 0) player.y = 0;
  if (player.y + player.h > height) player.y = height - player.h;

  // AI smooth movement
  let aiCenter = ai.y + ai.h/2;
  let targetDelta = ai.targetY - aiCenter;
  let moveDist = PADDLE_SPEED * dt;
  
  if (Math.abs(targetDelta) > moveDist) {
      ai.y += Math.sign(targetDelta) * moveDist;
  } else {
      ai.y = ai.targetY - ai.h/2;
  }

  // AI bounds
  if (ai.y < 0) ai.y = 0;
  if (ai.y + ai.h > height) ai.y = height - ai.h;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  let collided = false;

  // Top/Bottom walls
  if (ball.y <= ball.radius) {
    ball.y = ball.radius;
    ball.vy *= -1;
    collided = true;
  } else if (ball.y >= height - ball.radius) {
    ball.y = height - ball.radius;
    ball.vy *= -1;
    collided = true;
  }

  // Player paddle
  if (ball.vx < 0 && 
      ball.x - ball.radius <= player.x + player.w && 
      ball.x + ball.radius >= player.x &&
      ball.y >= player.y && 
      ball.y <= player.y + player.h) {
    
    ball.x = player.x + player.w + ball.radius;
    ball.vx *= -1;
    
    let hitFactor = (ball.y - (player.y + player.h/2)) / (player.h/2);
    ball.vy = hitFactor * ball.speed * 0.8; 
    ball.speed += 5; // speed up game
    
    let vel = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
    ball.vx = (ball.vx / vel) * ball.speed;
    ball.vy = (ball.vy / vel) * ball.speed;
    
    collided = true;
  }

  // AI paddle
  if (ball.vx > 0 && 
      ball.x + ball.radius >= ai.x && 
      ball.x - ball.radius <= ai.x + ai.w &&
      ball.y >= ai.y && 
      ball.y <= ai.y + ai.h) {
      
    ball.x = ai.x - ball.radius;
    ball.vx *= -1;
    
    let hitFactor = (ball.y - (ai.y + ai.h/2)) / (ai.h/2);
    ball.vy = hitFactor * ball.speed * 0.8;
    ball.speed += 5;

    let vel = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
    ball.vx = (ball.vx / vel) * ball.speed;
    ball.vy = (ball.vy / vel) * ball.speed;

    collided = true;
  }

  if (collided) {
    updatePrediction();
  }

  // Score evaluation
  if (ball.x < 0) {
    score.ai++;
    updateScore();
    ball.speed = 450;
    resetBall();
  } else if (ball.x > width) {
    score.player++;
    updateScore();
    ball.speed = 450;
    resetBall();
  }

  // Update UI stats roughly 10 times a sec for readability to avoid unreadable blur
  if (performance.now() % 100 < 20) {
      statVel.textContent = `X: ${Math.round(ball.vx)}, Y: ${Math.round(ball.vy)}`;
  }
}

function draw() {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.setLineDash([10, 15]);
  ctx.moveTo(width/2, 0);
  ctx.lineTo(width/2, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Raycast Trajectory
  if (gameState === 'PLAYING' && trajectory.length > 1 && ball.vx > 0) {
    ctx.strokeStyle = 'rgba(42, 158, 151, 0.5)'; // cyan-dim with opacity
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    for (let i = 1; i < trajectory.length; i++) {
        ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    let lastPoint = trajectory[trajectory.length - 1];
    ctx.fillStyle = 'rgba(90, 228, 220, 0.8)'; // cyan
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player Paddle
  ctx.fillStyle = '#e8e0d0'; // cream
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // AI Paddle
  ctx.fillRect(ai.x, ai.y, ai.w, ai.h);

  // Ball
  ctx.fillStyle = '#fff';
  if (gameState === 'PLAYING' || (gameState === 'START' && performance.now() % 1000 > 500)) {
     // Blinking ball at idle
     ctx.beginPath();
     ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
     ctx.fill();
  }
}

// Ensure init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
