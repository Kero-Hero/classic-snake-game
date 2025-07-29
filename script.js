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
        this.currentMap = 'classic';
        this.obstacles = [];
        
        // 蛇的初始状态
        this.snake = [
            { x: 10, y: 10 }
        ];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        
        // 食物
        this.food = this.generateFood();
        
        // 奖励球系统
        this.bonusFood = null;
        this.bonusTimer = 0;
        this.bonusDuration = 5000; // 5秒
        this.bonusSpawnInterval = 5; // 每吃5个球生成一个奖励球
        this.foodEaten = 0;
        
        // 游戏循环
        this.gameLoop = null;
        
        // 初始化
        this.initializeElements();
        this.setupEventListeners();
        this.updateDisplay();
        this.initializeMap();
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
            soundToggle: document.getElementById('sound-toggle'),
            mapSelect: document.getElementById('map-select'),
            slowBtn: document.getElementById('slow-btn'),
            bonusTimerDisplay: document.getElementById('bonus-timer-display'),
            bonusTimer: document.getElementById('bonus-timer')
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
        
        // 地图选择
        this.elements.mapSelect.addEventListener('change', (e) => {
            this.setMap(e.target.value);
        });
        
        // 减速按钮
        this.elements.slowBtn.addEventListener('click', () => {
            this.slowDown();
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
            case 'KeyL':
                this.slowDown();
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
    
    setMap(mapType) {
        this.currentMap = mapType;
        this.initializeMap();
        this.food = this.generateFood();
        this.draw();
    }
    
    initializeMap() {
        this.obstacles = [];
        
        switch (this.currentMap) {
            case 'maze':
                // 迷宫地图 - 添加一些墙壁
                this.obstacles = [
                    // 上方障碍
                    {x: 5, y: 5}, {x: 6, y: 5}, {x: 7, y: 5}, {x: 8, y: 5},
                    {x: 12, y: 5}, {x: 13, y: 5}, {x: 14, y: 5},
                    // 左侧障碍
                    {x: 3, y: 8}, {x: 3, y: 9}, {x: 3, y: 10}, {x: 3, y: 11},
                    // 右侧障碍
                    {x: 16, y: 8}, {x: 16, y: 9}, {x: 16, y: 10}, {x: 16, y: 11},
                    // 下方障碍
                    {x: 6, y: 14}, {x: 7, y: 14}, {x: 8, y: 14}, {x: 9, y: 14},
                    {x: 11, y: 14}, {x: 12, y: 14}, {x: 13, y: 14},
                    // 中央障碍
                    {x: 9, y: 9}, {x: 10, y: 9}, {x: 9, y: 10}, {x: 10, y: 10}
                ];
                break;
            case 'cross':
                // 十字地图 - 创建十字形通道（移除四个角的7*7障碍物，只留一层十字障碍物）
                for (let i = 0; i < this.tileCount; i++) {
                    for (let j = 0; j < this.tileCount; j++) {
                        // 只留下十字形区域，移除四个角的7*7区域
                        const inVerticalCorridor = (i >= 8 && i <= 11);
                        const inHorizontalCorridor = (j >= 8 && j <= 11);
                        const inTopLeftCorner = (i < 7 && j < 7);
                        const inTopRightCorner = (i > 12 && j < 7);
                        const inBottomLeftCorner = (i < 7 && j > 12);
                        const inBottomRightCorner = (i > 12 && j > 12);
                        
                        // 如果不在十字通道中，且不在角落的7*7区域中，则设为障碍物
                        if (!inVerticalCorridor && !inHorizontalCorridor && 
                            !inTopLeftCorner && !inTopRightCorner && 
                            !inBottomLeftCorner && !inBottomRightCorner) {
                            this.obstacles.push({x: i, y: j});
                        }
                    }
                }
                break;
            case 'border':
                // 边框地图 - 把边框放在地图的边界
                for (let i = 0; i < this.tileCount; i++) {
                    this.obstacles.push({x: i, y: 0});      // 上边框
                    this.obstacles.push({x: i, y: this.tileCount - 1}); // 下边框
                }
                for (let j = 1; j < this.tileCount - 1; j++) {
                    this.obstacles.push({x: 0, y: j});      // 左边框
                    this.obstacles.push({x: this.tileCount - 1, y: j}); // 右边框
                }
                break;
            case 'spiral':
                // 螺旋地图 - 创建螺旋形状的障碍物
                const centerX = Math.floor(this.tileCount / 2);
                const centerY = Math.floor(this.tileCount / 2);
                for (let radius = 2; radius < 7; radius++) {
                    // 外圈
                    for (let j = centerX - radius; j <= centerX + radius; j++) {
                        if (j >= 0 && j < this.tileCount) {
                            if (centerY - radius >= 0) this.obstacles.push({x: j, y: centerY - radius});
                            if (centerY + radius < this.tileCount) this.obstacles.push({x: j, y: centerY + radius});
                        }
                    }
                    for (let j = centerY - radius + 1; j < centerY + radius; j++) {
                        if (j >= 0 && j < this.tileCount) {
                            if (centerX - radius >= 0) this.obstacles.push({x: centerX - radius, y: j});
                            if (centerX + radius < this.tileCount) this.obstacles.push({x: centerX + radius, y: j});
                        }
                    }
                    // 创建螺旋通道的间隙
                    if (radius % 2 === 0 && centerX + radius < this.tileCount && centerY - radius + 1 >= 0) {
                        this.obstacles = this.obstacles.filter(obs => 
                            !(obs.x === centerX + radius && obs.y === centerY - radius + 1)
                        );
                    }
                }
                break;
            case 'diamond':
                // 钻石地图 - 创建菱形障碍物
                const midPoint = Math.floor(this.tileCount / 2);
                for (let i = 0; i < this.tileCount; i++) {
                    for (let j = 0; j < this.tileCount; j++) {
                        const distanceFromCenter = Math.abs(i - midPoint) + Math.abs(j - midPoint);
                        // 创建菱形边界，但留出通道
                        if (distanceFromCenter >= 6 && distanceFromCenter <= 7) {
                            this.obstacles.push({x: i, y: j});
                        }
                        // 添加内部小菱形
                        if (distanceFromCenter >= 2 && distanceFromCenter <= 3) {
                            this.obstacles.push({x: i, y: j});
                        }
                    }
                }
                break;
            case 'tunnel':
                // 隧道地图 - 创建多个隧道
                for (let i = 0; i < this.tileCount; i++) {
                    // 水平隧道
                    if (i < 4 || i > 15) {
                        for (let j = 6; j < 14; j++) {
                            this.obstacles.push({x: i, y: j});
                        }
                    }
                    // 垂直隧道
                    if (i >= 6 && i <= 13) {
                        for (let j = 0; j < 4; j++) {
                            this.obstacles.push({x: i, y: j});
                        }
                        for (let j = 16; j < this.tileCount; j++) {
                            this.obstacles.push({x: i, y: j});
                        }
                    }
                }
                break;
            case 'rooms':
                // 房间地图 - 创建几个房间，用门连接
                // 左上房间
                for (let i = 2; i <= 8; i++) {
                    this.obstacles.push({x: i, y: 2});
                    this.obstacles.push({x: i, y: 8});
                }
                for (let j = 2; j <= 8; j++) {
                    if (j !== 5) { // 留门
                        this.obstacles.push({x: 2, y: j});
                        this.obstacles.push({x: 8, y: j});
                    }
                }
                
                // 右下房间
                for (let i = 11; i <= 17; i++) {
                    this.obstacles.push({x: i, y: 11});
                    this.obstacles.push({x: i, y: 17});
                }
                for (let j = 11; j <= 17; j++) {
                    if (j !== 14) { // 留门
                        this.obstacles.push({x: 11, y: j});
                        this.obstacles.push({x: 17, y: j});
                    }
                }
                
                // 中央连接通道
                for (let i = 9; i <= 10; i++) {
                    for (let j = 9; j <= 10; j++) {
                        // 中央连接区域保持空白
                    }
                }
                break;
            case 'snake':
                // 蛇形地图 - 创建蛇形图案的障碍物
                for (let i = 0; i < this.tileCount; i++) {
                    // 创建蛇形图案
                    const waveHeight = Math.floor(4 * Math.sin(i * 0.4)) + Math.floor(this.tileCount / 2);
                    for (let j = 0; j < this.tileCount; j++) {
                        // 上方波浪
                        if (Math.abs(j - (waveHeight - 2)) <= 1 && waveHeight - 2 >= 0) {
                            this.obstacles.push({x: i, y: j});
                        }
                        // 下方反向波浪
                        const invWaveHeight = this.tileCount - 1 - (Math.floor(4 * Math.sin((i + 8) * 0.4)) + Math.floor(this.tileCount / 2 - 4));
                        if (Math.abs(j - (invWaveHeight + 2)) <= 1 && invWaveHeight + 2 < this.tileCount) {
                            this.obstacles.push({x: i, y: j});
                        }
                    }
                }
                break;
            default:
                // 经典地图 - 无障碍
                this.obstacles = [];
                break;
        }
    }
    
    slowDown() {
        if (this.gameState !== 'running') return;
        
        // 增加蛇身长度（不移除尾部）
        const tail = {...this.snake[this.snake.length - 1]};
        this.snake.push(tail);
        
        // 减速
        this.gameSpeed = Math.min(300, this.gameSpeed + 20);
        this.restartGameLoop();
        
        // 播放减速音效
        this.playSound(300, 150);
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
        
        // 重置奖励球系统
        this.bonusFood = null;
        this.bonusTimer = 0;
        this.foodEaten = 0;
        this.elements.bonusTimerDisplay.style.display = 'none';
        
        // 初始化地图
        this.initializeMap();
        
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
        
        // 重置奖励球系统
        this.bonusFood = null;
        this.bonusTimer = 0;
        this.foodEaten = 0;
        this.elements.bonusTimerDisplay.style.display = 'none';
        
        // 初始化地图
        this.initializeMap();
        
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
        
        // 更新奖励球
        this.updateBonusFood();
        
        // 更新方向
        this.direction = { ...this.nextDirection };
        
        // 如果蛇没有移动，跳过更新
        if (this.direction.x === 0 && this.direction.y === 0) return;
        
        // 计算蛇头新位置
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        // 检查边界碰撞 - 如果没有障碍物则可以穿过边界
        if (this.currentMap === 'classic') {
            // 经典模式：可以穿过边界
            if (head.x < 0) head.x = this.tileCount - 1;
            if (head.x >= this.tileCount) head.x = 0;
            if (head.y < 0) head.y = this.tileCount - 1;
            if (head.y >= this.tileCount) head.y = 0;
        } else {
            // 有障碍物的地图：撞边界就游戏结束
            if (head.x < 0 || head.x >= this.tileCount || 
                head.y < 0 || head.y >= this.tileCount) {
                this.gameOver();
                return;
            }
        }
        
        // 检查障碍物碰撞
        if (this.obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
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
        
        // 检查是否吃到奖励球
        if (this.bonusFood && head.x === this.bonusFood.x && head.y === this.bonusFood.y) {
            const remainingSeconds = Math.ceil(this.bonusTimer / 1000);
            const bonusScore = 10 * remainingSeconds; // 基础分10分乘以剩余时间（秒）
            this.score += bonusScore;
            
            // 显示奖励信息（可以考虑添加到UI中）
            console.log(`奖励球！获得 ${bonusScore} 分！(剩余时间: ${remainingSeconds}秒)`);
            
            this.bonusFood = null;
            this.elements.bonusTimerDisplay.style.display = 'none';
            
            this.updateDisplay();
            
            // 播放奖励球被吃音效
            this.playSound(1320, 200); // E6
        }
        // 检查是否吃到普通食物
        else if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.foodEaten++;
            this.food = this.generateFood();
            
            // 检查是否需要生成奖励球
            if (this.foodEaten % this.bonusSpawnInterval === 0 && !this.bonusFood) {
                this.spawnBonusFood();
            }
            
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
        } while (
            this.snake.some(segment => segment.x === food.x && segment.y === food.y) ||
            this.obstacles.some(obstacle => obstacle.x === food.x && obstacle.y === food.y) ||
            (this.bonusFood && this.bonusFood.x === food.x && this.bonusFood.y === food.y)
        );
        
        return food;
    }
    
    generateBonusFood() {
        let bonusFood;
        do {
            bonusFood = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (
            this.snake.some(segment => segment.x === bonusFood.x && segment.y === bonusFood.y) ||
            this.obstacles.some(obstacle => obstacle.x === bonusFood.x && obstacle.y === bonusFood.y) ||
            (this.food.x === bonusFood.x && this.food.y === bonusFood.y)
        );
        
        return bonusFood;
    }
    
    spawnBonusFood() {
        this.bonusFood = this.generateBonusFood();
        this.bonusTimer = this.bonusDuration;
        this.elements.bonusTimerDisplay.style.display = 'block';
        
        // 播放奖励球出现音效
        this.playSound(880, 200); // A5
    }
    
    updateBonusFood() {
        if (this.bonusFood) {
            this.bonusTimer -= this.gameSpeed;
            if (this.bonusTimer <= 0) {
                this.bonusFood = null;
                this.elements.bonusTimerDisplay.style.display = 'none';
                
                // 播放奖励球消失音效
                this.playSound(220, 150); // A3
            } else {
                // 更新显示倒计时（向上取整到秒）
                const remainingSeconds = Math.ceil(this.bonusTimer / 1000);
                this.elements.bonusTimer.textContent = remainingSeconds;
            }
        }
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格（可选）
        this.drawGrid();
        
        // 绘制障碍物
        this.drawObstacles();
        
        // 绘制食物
        this.drawFood();
        
        // 绘制奖励球
        if (this.bonusFood) {
            this.drawBonusFood();
        }
        
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
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            const x = obstacle.x * this.gridSize;
            const y = obstacle.y * this.gridSize;
            
            // 障碍物阴影
            this.ctx.fillStyle = 'rgba(120, 120, 120, 0.3)';
            this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
            
            // 障碍物主体
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            
            // 障碍物高光
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(x + 3, y + 3, this.gridSize - 8, this.gridSize - 8);
        });
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
    
    drawBonusFood() {
        const x = this.bonusFood.x * this.gridSize;
        const y = this.bonusFood.y * this.gridSize;
        
        // 计算闪烁效果
        const time = Date.now();
        const pulseOpacity = 0.7 + 0.3 * Math.sin(time * 0.01);
        
        // 绘制奖励球外圈（金色光环）
        this.ctx.fillStyle = `rgba(255, 215, 0, ${pulseOpacity * 0.5})`;
        this.ctx.fillRect(x, y, this.gridSize, this.gridSize);
        
        // 绘制奖励球阴影
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
        
        // 绘制奖励球主体（金色）
        this.ctx.fillStyle = `rgba(255, 215, 0, ${pulseOpacity})`;
        this.ctx.fillRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6);
        
        // 添加白色高光效果
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(x + 5, y + 5, 4, 4);
        
        // 添加星星效果
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const centerX = x + this.gridSize / 2;
        const centerY = y + this.gridSize / 2;
        this.ctx.fillRect(centerX - 1, centerY - 3, 2, 6);
        this.ctx.fillRect(centerX - 3, centerY - 1, 6, 2);
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
    console.log('🌟 新功能：');
    console.log('- 奖励球系统：每吃5个食物出现金色奖励球');
    console.log('- 更多地图选择：螺旋、钻石、隧道、房间、蛇形');
    console.log('- 优化的十字和边框地图');
    console.log('尽情享受游戏吧！');
    
    // 调试功能：快速测试奖励球
    window.testBonusFood = () => {
        game.foodEaten = 4; // 设置为4，下一个食物会触发奖励球
        console.log('下一个食物将触发奖励球！');
    };
});
