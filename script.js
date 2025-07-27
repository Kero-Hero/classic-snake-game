class SnakeGame {
    constructor() {
        // 游戏配置
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // 游戏状态
        this.gameState = 'stopped'; // stopped, running, paused, gameOver
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.speedLevel = 1;
        this.gameSpeed = 200;
        this.soundEnabled = true;
        
        // 蛇的初始状态
        this.snake = [
            { x: 10, y: 10 }
        ];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        
        // 食物
        this.food = this.generateFood();
        
        // 游戏循环
        this.gameLoop = null;
        
        // 初始化
        this.initializeElements();
        this.setupEventListeners();
        this.updateDisplay();
        this.draw();
        
        // 创建音效
        this.createSounds();
    }
    
    initializeElements() {
        // 获取DOM元素
        this.elements = {
            currentScore: document.getElementById('current-score'),
            highScore: document.getElementById('high-score'),
            speedLevel: document.getElementById('speed-level'),
            startBtn: document.getElementById('start-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            resetBtn: document.getElementById('reset-btn'),
            gameOverOverlay: document.getElementById('game-over-overlay'),
            pauseOverlay: document.getElementById('pause-overlay'),
            finalScore: document.getElementById('final-score'),
            newRecord: document.getElementById('new-record'),
            restartBtn: document.getElementById('restart-btn'),
            difficulty: document.getElementById('difficulty'),
            soundToggle: document.getElementById('sound-toggle')
        };
    }
    
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
        
        // 按钮事件
        this.elements.startBtn.addEventListener('click', () => {
            this.startGame();
        });
        
        this.elements.pauseBtn.addEventListener('click', () => {
            this.togglePause();
        });
        
        this.elements.resetBtn.addEventListener('click', () => {
            this.resetGame();
        });
        
        this.elements.restartBtn.addEventListener('click', () => {
            this.startGame();
        });
        
        // 方向控制按钮
        document.querySelectorAll('.dir-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const direction = btn.dataset.direction;
                if (direction) {
                    this.setDirection(direction);
                }
            });
        });
        
        // 难度选择
        this.elements.difficulty.addEventListener('change', (e) => {
            this.setDifficulty(e.target.value);
        });
        
        // 音效切换
        this.elements.soundToggle.addEventListener('click', () => {
            this.toggleSound();
        });
        
        // 触摸事件（移动端支持）
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.gameState !== 'running') return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // 水平滑动
                if (deltaX > 0) {
                    this.setDirection('right');
                } else {
                    this.setDirection('left');
                }
            } else {
                // 垂直滑动
                if (deltaY > 0) {
                    this.setDirection('down');
                } else {
                    this.setDirection('up');
                }
            }
        });
    }
    
    createSounds() {
        // 创建Web Audio API音效
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    playSound(frequency, duration = 100, type = 'square') {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }
    
    handleKeyPress(e) {
        // 防止页面滚动
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
        
        switch (e.code) {
            case 'ArrowUp':
                this.setDirection('up');
                break;
            case 'ArrowDown':
                this.setDirection('down');
                break;
            case 'ArrowLeft':
                this.setDirection('left');
                break;
            case 'ArrowRight':
                this.setDirection('right');
                break;
            case 'Space':
                if (this.gameState === 'running') {
                    this.togglePause();
                } else if (this.gameState === 'paused') {
                    this.togglePause();
                }
                break;
            case 'Enter':
                if (this.gameState === 'stopped' || this.gameState === 'gameOver') {
                    this.startGame();
                }
                break;
        }
    }
    
    setDirection(direction) {
        if (this.gameState !== 'running') return;
        
        const directions = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };
        
        const newDirection = directions[direction];
        
        // 防止蛇直接反向移动
        if (this.direction.x !== -newDirection.x || this.direction.y !== -newDirection.y) {
            this.nextDirection = newDirection;
        }
    }
    
    setDifficulty(level) {
        const difficulties = {
            easy: { speed: 300, speedIncrement: 5 },
            normal: { speed: 200, speedIncrement: 8 },
            hard: { speed: 150, speedIncrement: 12 },
            expert: { speed: 100, speedIncrement: 15 }
        };
        
        this.difficulty = difficulties[level];
        this.gameSpeed = this.difficulty.speed;
        
        if (this.gameState === 'running') {
            this.restartGameLoop();
        }
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.elements.soundToggle.textContent = this.soundEnabled ? '开启' : '关闭';
        this.elements.soundToggle.classList.toggle('active', this.soundEnabled);
        
        if (this.soundEnabled) {
            this.playSound(800, 50);
        }
    }
    
    startGame() {
        if (this.gameState === 'paused') {
            this.resumeGame();
            return;
        }
        
        this.gameState = 'running';
        this.score = 0;
        this.speedLevel = 1;
        this.gameSpeed = this.difficulty?.speed || 200;
        
        // 重置蛇
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        
        // 生成新食物
        this.food = this.generateFood();
        
        // 隐藏遮罩
        this.elements.gameOverOverlay.classList.add('hidden');
        this.elements.pauseOverlay.classList.add('hidden');
        
        // 更新按钮状态
        this.elements.startBtn.disabled = true;
        this.elements.pauseBtn.disabled = false;
        
        // 更新显示
        this.updateDisplay();
        
        // 播放开始音效
        this.playSound(523, 100); // C5
        
        // 开始游戏循环
        this.startGameLoop();
    }
    
    pauseGame() {
        if (this.gameState !== 'running') return;
        
        this.gameState = 'paused';
        this.elements.pauseOverlay.classList.remove('hidden');
        this.stopGameLoop();
        
        this.playSound(392, 150); // G4
    }
    
    resumeGame() {
        if (this.gameState !== 'paused') return;
        
        this.gameState = 'running';
        this.elements.pauseOverlay.classList.add('hidden');
        this.startGameLoop();
        
        this.playSound(523, 100); // C5
    }
    
    togglePause() {
        if (this.gameState === 'running') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }
    
    resetGame() {
        this.stopGameLoop();
        this.gameState = 'stopped';
        this.score = 0;
        this.speedLevel = 1;
        
        // 重置蛇
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        
        // 生成新食物
        this.food = this.generateFood();
        
        // 隐藏遮罩
        this.elements.gameOverOverlay.classList.add('hidden');
        this.elements.pauseOverlay.classList.add('hidden');
        
        // 更新按钮状态
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        
        // 更新显示
        this.updateDisplay();
        this.draw();
        
        this.playSound(330, 100); // E4
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.stopGameLoop();
        
        // 检查是否创造新纪录
        let isNewRecord = false;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore.toString());
            isNewRecord = true;
        }
        
        // 显示游戏结束界面
        this.elements.finalScore.textContent = this.score;
        this.elements.newRecord.classList.toggle('hidden', !isNewRecord);
        this.elements.gameOverOverlay.classList.remove('hidden');
        
        // 更新按钮状态
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        
        // 更新显示
        this.updateDisplay();
        
        // 播放游戏结束音效
        this.playSound(196, 500, 'sawtooth'); // G3
    }
    
    startGameLoop() {
        this.gameLoop = setInterval(() => {
            this.update();
            this.draw();
        }, this.gameSpeed);
    }
    
    stopGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
    }
    
    restartGameLoop() {
        this.stopGameLoop();
        this.startGameLoop();
    }
    
    update() {
        if (this.gameState !== 'running') return;
        
        // 更新方向
        this.direction = { ...this.nextDirection };
        
        // 如果蛇没有移动，跳过更新
        if (this.direction.x === 0 && this.direction.y === 0) return;
        
        // 计算蛇头新位置
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        // 检查边界碰撞
        if (head.x < 0 || head.x >= this.tileCount || 
            head.y < 0 || head.y >= this.tileCount) {
            this.gameOver();
            return;
        }
        
        // 检查自身碰撞
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver();
            return;
        }
        
        // 添加新头部
        this.snake.unshift(head);
        
        // 检查是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.food = this.generateFood();
            
            // 增加速度
            this.speedLevel = Math.floor(this.score / 50) + 1;
            const newSpeed = Math.max(50, this.gameSpeed - (this.difficulty?.speedIncrement || 8));
            if (newSpeed !== this.gameSpeed) {
                this.gameSpeed = newSpeed;
                this.restartGameLoop();
            }
            
            this.updateDisplay();
            
            // 播放吃食物音效
            this.playSound(659, 100); // E5
        } else {
            // 移除尾部
            this.snake.pop();
        }
    }
    
    generateFood() {
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === food.x && segment.y === food.y));
        
        return food;
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格（可选）
        this.drawGrid();
        
        // 绘制食物
        this.drawFood();
        
        // 绘制蛇
        this.drawSnake();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.tileCount; i++) {
            const pos = i * this.gridSize;
            
            // 垂直线
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();
            
            // 水平线
            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();
        }
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        
        // 绘制食物阴影
        this.ctx.fillStyle = 'rgba(255, 51, 102, 0.3)';
        this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
        
        // 绘制食物主体
        this.ctx.fillStyle = '#ff3366';
        this.ctx.fillRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6);
        
        // 添加高光效果
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fillRect(x + 5, y + 5, 4, 4);
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            if (index === 0) {
                // 绘制蛇头
                this.drawSnakeHead(x, y);
            } else {
                // 绘制蛇身
                this.drawSnakeBody(x, y, index);
            }
        });
    }
    
    drawSnakeHead(x, y) {
        // 蛇头阴影
        this.ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
        this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
        
        // 蛇头主体
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
        
        // 蛇头高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(x + 3, y + 3, this.gridSize - 8, this.gridSize - 8);
        
        // 绘制眼睛
        this.ctx.fillStyle = '#1a1a2e';
        const eyeSize = 2;
        const eyeOffset = 4;
        
        if (this.direction.x === 1) { // 向右
            this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
            this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + this.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
        } else if (this.direction.x === -1) { // 向左
            this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
            this.ctx.fillRect(x + eyeOffset, y + this.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
        } else if (this.direction.y === -1) { // 向上
            this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
            this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
        } else if (this.direction.y === 1) { // 向下
            this.ctx.fillRect(x + eyeOffset, y + this.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
            this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + this.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
        } else {
            // 默认眼睛位置
            this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
            this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
        }
    }
    
    drawSnakeBody(x, y, index) {
        // 蛇身阴影
        this.ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
        
        // 蛇身主体 - 根据位置调整颜色深度
        const opacity = Math.max(0.4, 1 - index * 0.05);
        this.ctx.fillStyle = `rgba(0, 255, 136, ${opacity})`;
        this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
        
        // 蛇身高光
        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        this.ctx.fillRect(x + 4, y + 4, this.gridSize - 8, this.gridSize - 8);
    }
    
    updateDisplay() {
        this.elements.currentScore.textContent = this.score;
        this.elements.highScore.textContent = this.highScore;
        this.elements.speedLevel.textContent = this.speedLevel;
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new SnakeGame();
    
    // 全局游戏实例，便于调试
    window.snakeGame = game;
    
    console.log('🐍 贪吃蛇游戏已启动！');
    console.log('使用方向键或点击方向按钮控制蛇的移动');
    console.log('按空格键暂停/继续游戏');
    console.log('尽情享受游戏吧！');
});
