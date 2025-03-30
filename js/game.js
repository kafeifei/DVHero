import { Player } from './player.js'; // Import Player class
import { EnemyLibrary } from './enemies.js'; // Import EnemyLibrary
import { WeaponsLibrary } from './weapons.js'; // Import WeaponsLibrary
import { ExperienceOrb, Projectile, Particle, Effect } from './projectile.js'; // Import needed classes
import { ThreeHelper } from './three-helper.js'; // Import ThreeHelper
import { Utils } from './utils.js'; // Import Utils
// Import image generation functions instead of image URLs
import {
    generateGrassTexture,
    generateCastleTowerTexture,
    generateBrokenPillarTexture,
    generateGravestoneTexture,
    generateDeadTreeTexture,
    generateTorchTexture,
} from './imageGenerator.js';

export class Game {
    constructor() {
        this.canvas2d = document.getElementById('game-canvas');
        this.canvas3d = document.getElementById('game-canvas-3d');

        // 创建UI Canvas用于在任何模式下显示UI
        this.canvasUI = document.createElement('canvas');
        this.canvasUI.id = 'game-canvas-ui';
        this.canvasUI.className = 'ui-layer';

        // 创建Canvas容器
        const container = document.getElementById('game-container');
        if (container) {
            container.appendChild(this.canvasUI);
        }

        // 3D支持
        this.is3D = false; // 默认从2D模式开始，会在initGame中设置为3D
        this.threeHelperLoaded = false; // 标记ThreeHelper是否已加载
        this.threeHelperLoading = false; // Three.js模块是否正在加载中
        this._pendingRender = null; // 用于跟踪待处理的渲染请求
        
        this.frameCount = 0;
        this.gameTime = 0;
        this.isRunning = false;
        this.isGameOver = false;
        this.isPaused = false;

        // 设置Canvas尺寸 - 改为自适应
        this.canvas2d.width = this.canvas2d.parentElement ? this.canvas2d.parentElement.clientWidth : window.innerWidth;
        this.canvas2d.height = this.canvas2d.parentElement ? this.canvas2d.parentElement.clientHeight : window.innerHeight;
        // 3D画布也使用相同的尺寸
        this.canvas3d.width = this.canvas2d.width;
        this.canvas3d.height = this.canvas2d.height;

        // 初始化2D上下文，禁用alpha通道以减少闪烁
        this.ctx = this.canvas2d.getContext('2d', { 
            willReadFrequently: true,
            alpha: false 
        });
        
        // 禁用图像平滑，提高像素风格画面清晰度
        if (this.ctx) {
            this.ctx.imageSmoothingEnabled = false;
        }

        // 帧率控制
        this.fps = 60;
        this.fpsInterval = 1000 / this.fps;
        this.lastFrameTime = 0;

        // 游戏资源 - Dynamically generate images
        this.images = {};
        console.log('开始生成图片...');
        this.images.grassTexture = generateGrassTexture();
        this.images.castleTower = generateCastleTowerTexture();
        this.images.brokenPillar = generateBrokenPillarTexture();
        this.images.gravestone = generateGravestoneTexture();
        this.images.deadTree = generateDeadTreeTexture();
        this.images.torch = generateTorchTexture();
        console.log('所有图片生成完毕。');
        // Images are now generated synchronously, so they are ready immediately
        this.imagesReady = true; 

        // 恶魔城背景元素
        this.backgroundObjects = [];
        this.generateBackgroundObjects();

        // 输入控制
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.isDragging = false;
        this.dragStartX = null;
        this.dragStartY = null;
        this.dragStartPlayerX = null;
        this.dragStartPlayerY = null;

        // 游戏元素
        this.player = new Player(this);
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.effects = [];
        this.expOrbs = [];

        // 等级和难度设置
        this.gameLevel = 1;
        this.difficultyMultiplier = 1;
        this.attackMultiplier = 1;
        this.enemySpawnRate = 60; // 降低初始生成间隔（原来90帧/个，现在60帧/个）
        this.maxEnemies = 100; // 提高初始最大敌人数量（原来60个，现在100个）
        this.enemyTypes = [
            { type: EnemyLibrary.Zombie, weight: 100, minGameLevel: 1 },
            { type: EnemyLibrary.SkeletonSoldier, weight: 80, minGameLevel: 1 },
            { type: EnemyLibrary.AxeArmor, weight: 50, minGameLevel: 2 },
            { type: EnemyLibrary.MedusaHead, weight: 70, minGameLevel: 3 },
            { type: EnemyLibrary.BladeSoldier, weight: 40, minGameLevel: 4 },
            { type: EnemyLibrary.SpearGuard, weight: 30, minGameLevel: 5 },
            { type: EnemyLibrary.FireDemon, weight: 20, minGameLevel: 8 },
            { type: EnemyLibrary.ValhallaKnight, weight: 15, minGameLevel: 10 },
            { type: EnemyLibrary.Gorgon, weight: 10, minGameLevel: 15 },
            { type: EnemyLibrary.Guardian, weight: 5, minGameLevel: 20 },
        ];

        // UI元素
        this.levelUpElement = document.getElementById('level-up');
        this.weaponChoicesElement = document.getElementById('weapon-choices');
        this.warningText = '';
        this.warningTimer = 0;

        // 添加测试按钮
        this.addTestButton();

        // 初始化
        this.init();
        
        // 初始化事件监听器引用
        this._eventHandlers = {};
        this._handleKeyDown = null;
        this._handleKeyUp = null;
        
        // 注意：键盘事件不在这里设置，而是由setupAllEventListeners设置
    }

    // 更新Canvas显示状态
    updateCanvasVisibility() {
        // 获取canvas元素，确保它们存在
        let canvas2d = document.getElementById('game-canvas');
        let canvas3d = document.getElementById('game-canvas-3d');

        if (canvas2d && canvas3d) {
            if (this.is3D) {
                // 3D模式：3D canvas活跃，2D canvas不活跃
                
                // 设置2D Canvas为不可见
                canvas2d.style.display = 'none';
                canvas2d.style.visibility = 'hidden';
                canvas2d.classList.remove('active');
                canvas2d.classList.add('inactive');
                
                // 设置3D Canvas为可见
                canvas3d.style.display = 'block';
                canvas3d.style.visibility = 'visible';
                canvas3d.classList.remove('inactive');
                canvas3d.classList.add('active');
                
                // 强制重绘 - 只使用一个渲染请求
                if (this._pendingRender) {
                    cancelAnimationFrame(this._pendingRender);
                }
                
                this._pendingRender = requestAnimationFrame(() => {
                    if (this.threeHelper && this.threeHelper.renderer) {
                        this.threeHelper.render();
                    }
                    this._pendingRender = null;
                });
            } else {
                // 2D模式：2D canvas活跃，3D canvas不活跃
                
                // 设置3D Canvas为不可见
                canvas3d.style.display = 'none';
                canvas3d.style.visibility = 'hidden';
                canvas3d.classList.remove('active');
                canvas3d.classList.add('inactive');
                
                // 设置2D Canvas为可见
                canvas2d.style.display = 'block';
                canvas2d.style.visibility = 'visible';
                canvas2d.classList.remove('inactive');
                canvas2d.classList.add('active');
                
                // 强制重绘 - 只使用一个渲染请求
                if (this._pendingRender) {
                    cancelAnimationFrame(this._pendingRender);
                }
                
                this._pendingRender = requestAnimationFrame(() => {
                    if (this.ctx) {
                        this.draw2D();
                    }
                    this._pendingRender = null;
                });
            }
        } else {
            console.warn('无法更新Canvas可见性，Canvas元素不存在', {
                canvas2d: canvas2d,
                canvas3d: canvas3d
            });
        }
    }

    // 切换3D/2D模式
    toggleMode() {
        // 如果图像尚未全部加载，显示提示并取消切换
        if (!this.imagesReady) {
            this.showWarning('图像资源尚未加载完成，请稍后再试', 180);
            return;
        }
        
        // 防止快速连续切换导致的问题
        if (this._modeChanging) {
            this.showWarning('模式切换中，请稍候...', 120);
            return;
        }
        
        this._modeChanging = true;
        setTimeout(() => this._modeChanging = false, 1000); // 1秒后允许再次切换
        
        // 如果要切换到3D模式
        if (!this.is3D) {
            // 检查ThreeHelper是否加载就绪
            if (!this.threeHelperLoaded) {
                this.showWarning('3D模式正在加载中，请稍后再试', 180);
                this._modeChanging = false;
                return;
            }
            
            this.showWarning('正在切换到3D模式...', 120);
            
            // 重建3D Canvas，避免WebGL上下文冲突
            this.recreate3DCanvas(() => {
                // Canvas重建成功后，加载Three.js
                import('./three-helper.js').then(module => {
                    // 清理旧的ThreeHelper
                    if (this.threeHelper) {
                        try {
                            this.threeHelper.dispose();
                        } catch (e) {
                            console.error('清理ThreeHelper失败:', e);
                        }
                    }
                    
                    try {
                        // 创建新的ThreeHelper
                        this.threeHelper = new module.ThreeHelper(this);
                        
                        // 切换到3D模式
                        this.is3D = true;
                        
                        // 设置事件监听
                        this.setupMouseEvents();
                        
                        // 更新Canvas可见性
                        this.updateCanvasVisibility();
                        
                        // 加载纹理和背景
                        if (this.threeHelper.loadBackgroundImages) {
                            this.threeHelper.loadBackgroundImages(true);
                        }
                        
                        // 调用resize方法确保3D模式画布尺寸正确
                        setTimeout(() => {
                            this.resize();
                        }, 100);
                        
                        // 显示切换完成的提示
                        this.showWarning('已切换到3D模式', 120);
                    } catch (error) {
                        console.error('3D初始化失败:', error);
                        this.showWarning('3D模式初始化失败，请稍后再试', 180);
                        
                        this._modeChanging = false;
                    }
                }).catch(error => {
                    console.error('切换到3D模式失败:', error);
                    this.showWarning('切换到3D模式失败，请稍后再试', 180);
                    
                    this._modeChanging = false;
                });
            });
        } 
        // 从3D切换到2D
        else {
            // 清理3D资源
            if (this.threeHelper) {
                try {
                    this.threeHelper.dispose();
                } catch (e) {
                    console.error('清理ThreeHelper失败:', e);
                }
                this.threeHelper = null;
            }
            
            // 切换到2D模式
            this.is3D = false;
            
            // 设置事件监听
            this.setupMouseEvents();
            
            // 更新Canvas可见性
            this.updateCanvasVisibility();
            
            // 调用resize方法确保2D模式画布尺寸正确
            setTimeout(() => {
                this.resize();
            }, 100);
            
            // 显示切换完成的提示
            this.showWarning('已切换到2D模式', 120);
            
            // 放弃模式切换锁
            this._modeChanging = false;
        }
    }
    
    // 辅助方法：重建3D Canvas
    recreate3DCanvas(callback) {
        const container = document.getElementById('game-container');
        const oldCanvas = document.getElementById('game-canvas-3d');
        
        if (!container || !oldCanvas) {
            console.error('找不到容器或Canvas元素');
            callback && callback();
            return;
        }
        
        // 保存原始位置和尺寸信息
        const width = oldCanvas.width;
        const height = oldCanvas.height;
        const classes = oldCanvas.className;
        
        // 按照以下顺序操作:
        // 1. 移除现有的canvas
        container.removeChild(oldCanvas);
        
        // 2. 进行一次浏览器的渲染循环，确保DOM更新和内存释放
        setTimeout(() => {
            // 3. 创建新的canvas
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'game-canvas-3d';
            newCanvas.width = width;
            newCanvas.height = height;
            newCanvas.className = classes;
            
            // 4. 添加新canvas到DOM
            container.appendChild(newCanvas);
            
            // 5. 更新引用
            this.canvas3d = newCanvas;
            console.log('3D Canvas重建完成，尺寸:', width, 'x', height);
            
            // 6. 调用回调函数
            callback && callback();
        }, 50); // 给浏览器一些时间来处理DOM更新
    }

    // 设置鼠标事件监听
    setupMouseEvents() {
        console.log('设置鼠标事件监听器');
        
        // 获取当前活动的canvas
        const canvas2d = document.getElementById('game-canvas');
        const canvas3d = document.getElementById('game-canvas-3d');
        
        if (!canvas2d || !canvas3d) {
            console.error('找不到Canvas元素，无法设置鼠标事件');
            return;
        }
        
        // 清除所有现有事件监听器
        this.removeEventListeners(this.canvas2d);
        this.removeEventListeners(this.canvas3d);
        
        // 使用现有的canvas，不替换它们
        this.canvas2d = canvas2d;
        this.canvas3d = canvas3d;
        
        // 确定当前活动的canvas
        const activeCanvas = this.is3D ? this.canvas3d : this.canvas2d;
        
        // 统一的事件处理函数
        const handleMouseDown = (e) => {
            if (e.button === 0) { // 左键
                this.isDragging = true;
                
                // 记录鼠标按下时的位置（用于计算移动方向）
                const rect = activeCanvas.getBoundingClientRect();
                this.dragStartX = e.clientX - rect.left;
                this.dragStartY = e.clientY - rect.top;
                this.mouseX = this.dragStartX;
                this.mouseY = this.dragStartY;
            }
        };
        
        const handleMouseMove = (e) => {
            // 获取鼠标相对于canvas的位置
            const rect = activeCanvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            
            if (this.isDragging) {
                // 在游戏主循环中处理移动逻辑，这里只更新鼠标位置
                // console.log('鼠标移动:', { mouseX: this.mouseX, mouseY: this.mouseY });
            }
        };
        
        const handleMouseUp = (e) => {
            if (e.button === 0) { // 左键
                this.isDragging = false;
                
                // 清除拖动的起始位置
                this.dragStartX = null;
                this.dragStartY = null;
            }
        };
        
        const handleMouseLeave = (e) => {
            // 鼠标离开canvas时停止拖拽
            if (this.isDragging) {
                this.isDragging = false;
                this.dragStartX = null;
                this.dragStartY = null;
            }
        };
        
        const handleContextMenu = (e) => {
            e.preventDefault();
        };
        
        const handleTouchStart = (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                this.isDragging = true;
                
                const rect = activeCanvas.getBoundingClientRect();
                this.mouseX = e.touches[0].clientX - rect.left;
                this.mouseY = e.touches[0].clientY - rect.top;
                
                this.dragStartX = this.mouseX;
                this.dragStartY = this.mouseY;
            }
        };
        
        const handleTouchMove = (e) => {
            e.preventDefault();
            if (e.touches.length > 0 && this.isDragging) {
                const rect = activeCanvas.getBoundingClientRect();
                this.mouseX = e.touches[0].clientX - rect.left;
                this.mouseY = e.touches[0].clientY - rect.top;
            }
        };
        
        const handleTouchEnd = (e) => {
            e.preventDefault();
            this.isDragging = false;
        };
        
        // 保存事件处理函数引用，方便以后移除
        this._eventHandlers = {
            mousedown: handleMouseDown,
            mousemove: handleMouseMove,
            mouseup: handleMouseUp,
            mouseleave: handleMouseLeave,
            contextmenu: handleContextMenu,
            touchstart: handleTouchStart,
            touchmove: handleTouchMove,
            touchend: handleTouchEnd
        };
        
        // 添加事件监听器到当前活动画布
        activeCanvas.addEventListener('mousedown', handleMouseDown);
        activeCanvas.addEventListener('mousemove', handleMouseMove);
        activeCanvas.addEventListener('mouseup', handleMouseUp);
        activeCanvas.addEventListener('mouseleave', handleMouseLeave);
        activeCanvas.addEventListener('contextmenu', handleContextMenu);
        activeCanvas.addEventListener('touchstart', handleTouchStart);
        activeCanvas.addEventListener('touchmove', handleTouchMove);
        activeCanvas.addEventListener('touchend', handleTouchEnd);
    }

    // 辅助函数：移除之前添加的事件监听器
    removeEventListeners(element) {
        if (!element || !this._eventHandlers) return;
        
        // 移除所有事件监听器
        if (this._eventHandlers.mousedown) {
            element.removeEventListener('mousedown', this._eventHandlers.mousedown);
        }
        if (this._eventHandlers.mousemove) {
            element.removeEventListener('mousemove', this._eventHandlers.mousemove);
        }
        if (this._eventHandlers.mouseup) {
            element.removeEventListener('mouseup', this._eventHandlers.mouseup);
        }
        if (this._eventHandlers.mouseleave) {
            element.removeEventListener('mouseleave', this._eventHandlers.mouseleave);
        }
        if (this._eventHandlers.contextmenu) {
            element.removeEventListener('contextmenu', this._eventHandlers.contextmenu);
        }
        if (this._eventHandlers.touchstart) {
            element.removeEventListener('touchstart', this._eventHandlers.touchstart);
        }
        if (this._eventHandlers.touchmove) {
            element.removeEventListener('touchmove', this._eventHandlers.touchmove);
        }
        if (this._eventHandlers.touchend) {
            element.removeEventListener('touchend', this._eventHandlers.touchend);
        }
    }

    init() {
        console.log('游戏初始化完成');
        
        // 初始化玩家位置
        this.player.x = 0;
        this.player.y = 0;
        
        // 添加初始武器
        this.player.addWeapon(WeaponsLibrary[0]);
        
        // 设置UI Canvas尺寸和上下文
        if (this.canvasUI) {
            this.canvasUI.width = this.canvas2d.width;
            this.canvasUI.height = this.canvas2d.height;
            this.ctxUI = this.canvasUI.getContext('2d', { willReadFrequently: true });
            console.log(`初始化UI Canvas: ${this.canvasUI.width}x${this.canvasUI.height}`);
        }
        
        // 显示测试功能提示
        setTimeout(() => {
            this.showWarning('按1生成敌人，按2重载纹理', 180);
        }, 2000);
        
        this.start();
        
        // 添加窗口大小变化的事件监听器
        this.resizeHandler = () => {
            this.resize();
        };
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.resizeHandler);
        
        // 初始化时调用一次resize以确保正确的初始布局
        setTimeout(() => {
            this.resize();
        }, 100);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastFrameTime = performance.now();
            
            // 确保玩家有至少一把武器
            if (this.player && this.player.weapons.length === 0) {
                console.log('发现玩家没有武器，添加初始武器');
                this.player.addWeapon(WeaponsLibrary[0]);
            }
            
            this.gameLoop(this.lastFrameTime);
        }
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        // 计算帧率间隔
        if (!timestamp) timestamp = 0;
        const elapsed = timestamp - this.lastFrameTime;

        // 只有当到达指定的帧率间隔时才更新和绘制
        if (elapsed > this.fpsInterval) {
            // 更新上一帧的时间，并调整误差
            this.lastFrameTime = timestamp - (elapsed % this.fpsInterval);

            if (!this.isPaused) {
                this.update();
            }

            // 在2D模式下使用requestAnimationFrame绘制，避免过多重绘
            if (!this.is3D) {
                // 避免多个绘制请求排队
                if (this._pendingRender) {
                    cancelAnimationFrame(this._pendingRender);
                }
                
                this._pendingRender = requestAnimationFrame(() => {
                    this.draw();
                    this._pendingRender = null;
                });
            } else {
                // 3D模式直接调用draw
                this.draw();
            }
            
            this.frameCount++;

            // 每60帧(1秒)增加游戏时间
            if (this.frameCount % 60 === 0) {
                this.gameTime++;

                // 每分钟增加游戏难度
                if (this.gameTime % 60 === 0) {
                    this.increaseDifficulty();
                }
            }
        }

        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    update() {
        // 更新玩家
        this.player.update();

        // 生成敌人
        if (
            this.frameCount % this.enemySpawnRate === 0 &&
            this.enemies.length < this.maxEnemies
        ) {
            this.spawnEnemy();
        }

        // 更新敌人
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(this);

            // 移除死亡的敌人
            if (!enemy.alive) {
                this.enemies.splice(i, 1);
            }
        }

        // 更新玩家投射物
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(this);

            // 检查与敌人的碰撞
            for (const enemy of this.enemies) {
                if (projectile.checkCollision(enemy)) {
                    projectile.hit(enemy);

                    if (!projectile.piercing) {
                        projectile.active = false;
                        break;
                    }
                }
            }

            // 移除无效的投射物
            if (!projectile.active) {
                this.projectiles.splice(i, 1);
            }
        }

        // 更新敌人投射物
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.enemyProjectiles[i];
            projectile.update(this);

            // 检查与玩家的碰撞
            if (projectile.checkCollision(this.player)) {
                projectile.hit(this.player);

                if (!projectile.piercing) {
                    projectile.active = false;
                }
            }

            // 移除无效的投射物
            if (!projectile.active) {
                this.enemyProjectiles.splice(i, 1);
            }
        }

        // 更新经验球
        for (let i = this.expOrbs.length - 1; i >= 0; i--) {
            const exp = this.expOrbs[i];
            exp.update(this);

            // 检查与玩家的碰撞
            if (
                Utils.distance(exp.x, exp.y, this.player.x, this.player.y) <
                this.player.radius + exp.radius
            ) {
                this.player.gainExperience(exp.value);
                this.expOrbs.splice(i, 1);
            }
        }

        // 更新粒子效果
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update();

            if (particle.lifetime <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 更新视觉效果
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update();

            if (effect.duration <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // 更新警告文本
        if (this.warningTimer > 0) {
            this.warningTimer--;
        }
    }

    draw() {
        if (this.isPaused && !this.levelUpElement.classList.contains('hidden'))
            return;

        // 清除UI画布
        if (this.ctxUI) {
            this.ctxUI.clearRect(
                0,
                0,
                this.canvasUI.width,
                this.canvasUI.height
            );
        }

        // 3D模式渲染处理
        if (this.is3D) {
            // 检查是否正在加载ThreeHelper
            if (this.threeHelperLoading) {
                // 正在加载中，显示2D模式并等待
                this.draw2D();
                this.draw2DUI();
                
                // 不持续显示提示，warningText会自动更新
                return;
            }
            
            // 1. 检查ThreeHelper是否存在
            if (!this.threeHelper) {
                console.warn('3D模式已启用但ThreeHelper未创建，回退到2D渲染');
                // 记录失败并切回2D模式
                this.renderFallbackTo2D('ThreeHelper未创建');
                return;
            }

            // 2. 检查渲染器是否存在
            if (!this.threeHelper.renderer) {
                console.warn('3D渲染器未初始化，回退到2D渲染');
                // 尝试重新创建渲染器
                if (!this.rendererCreateAttempts) {
                    this.rendererCreateAttempts = 0;
                }
                
                if (this.rendererCreateAttempts < 2) {
                    console.log(`尝试重新创建3D渲染器 (${this.rendererCreateAttempts + 1}/2)...`);
                    this.rendererCreateAttempts++;
                    const success = this.threeHelper.createRenderer();
                    if (!success) {
                        this.renderFallbackTo2D('无法创建3D渲染器');
                    } else {
                        this.draw(); // 重新尝试渲染
                    }
                    return;
                } else {
                    this.renderFallbackTo2D('多次尝试创建3D渲染器失败');
                    return;
                }
            }

            // 3. 尝试3D渲染
            try {
                // 执行渲染
                const renderSuccess = this.threeHelper.render();
                
                // 如果渲染失败，记录失败次数
                if (!renderSuccess) {
                    this.renderFailCount = (this.renderFailCount || 0) + 1;
                    console.warn(`3D渲染失败 (${this.renderFailCount}/5)`);
                    
                    
                    if (this.renderFailCount > 5) {
                        this.renderFallbackTo2D('3D渲染连续失败多次');
                        return;
                    }
                    
                    // 渲染失败但不需要切换模式时，使用2D模式渲染一帧
                    this.draw2D();
                } else {
                    // 渲染成功，重置失败计数
                    this.renderFailCount = 0;
                }

                // 在3D场景上绘制UI
                this.draw2DUI();

                if (this.isGameOver) {
                    this.drawGameOver();
                } else if (this.isPaused) {
                    this.drawPaused();
                }
                
                return;
            } catch (e) {
                console.error('3D渲染过程中发生错误:', e);
                this.renderErrorCount = (this.renderErrorCount || 0) + 1;
                
                if (this.renderErrorCount > 3) {
                    this.renderFallbackTo2D('3D渲染出错多次');
                    return;
                }
                
                // 出错时使用2D模式渲染
                this.draw2D();
                this.draw2DUI();
                return;
            }
        }

        // 2D渲染逻辑
        this.draw2D();
        this.draw2DUI();
        
        // 检查游戏是否结束或暂停，并绘制对应的UI
        if (this.isGameOver) {
            this.drawGameOver();
        } else if (this.isPaused) {
            this.drawPaused();
        }
    }

    // 从3D模式回退到2D模式的辅助方法
    renderFallbackTo2D(reason) {
        console.error(`切换回2D模式: ${reason}`);
        this.is3D = false;
        this.renderFailCount = 0;
        this.renderErrorCount = 0;
        this.rendererCreateAttempts = 0;
        
        // 更新Canvas可见性
        this.updateCanvasVisibility();
        
        // 显示警告提示
        this.showWarning('3D模式不可用，已切换到2D模式', 180);
        
        // 使用2D模式渲染
        this.draw2D();
        this.draw2DUI();
    }

    // 2D渲染逻辑
    draw2D() {
        try {
            // 确保2D上下文存在
            if (!this.ctx) {
                this.ctx = this.canvas2d.getContext('2d', {
                    willReadFrequently: true,
                    alpha: false // 禁用alpha通道，减少闪烁
                });
                if (!this.ctx) {
                    console.error('无法获取2D上下文');
                    return;
                }
                
                // 设置图像平滑
                this.ctx.imageSmoothingEnabled = false;
            }

            // 清除屏幕（使用完整尺寸，避免部分清除导致闪烁）
            this.ctx.clearRect(0, 0, this.canvas2d.width, this.canvas2d.height);

            // 计算相机偏移（使玩家居中）
            const cameraOffsetX = this.canvas2d.width / 2 - this.player.x;
            const cameraOffsetY = this.canvas2d.height / 2 - this.player.y;

            // 绘制背景
            this.drawBackground(cameraOffsetX, cameraOffsetY);

            // 绘制边界指示
            this.drawBoundary();

            // 绘制经验球
            try {
                this.expOrbs.forEach((orb) => {
                    try {
                        orb.draw(this.ctx, cameraOffsetX, cameraOffsetY);
                    } catch (e) {
                        console.error('绘制经验球错误:', e);
                    }
                });
            } catch (e) {
                console.error('经验球循环错误:', e);
            }

            // 绘制效果
            for (const effect of this.effects) {
                try {
                    effect.draw(this.ctx, cameraOffsetX, cameraOffsetY);
                } catch (e) {
                    console.error('绘制效果错误:', e);
                }
            }

            // 绘制敌人
            for (const enemy of this.enemies) {
                try {
                    enemy.draw(this.ctx, cameraOffsetX, cameraOffsetY);
                } catch (e) {
                    console.error('绘制敌人错误:', e);
                }
            }

            // 绘制玩家
            try {
                this.player.draw(this.ctx);
            } catch (e) {
                console.error('绘制玩家错误:', e);
            }

            // 绘制投射物
            for (const projectile of this.projectiles) {
                try {
                    projectile.draw(this.ctx, cameraOffsetX, cameraOffsetY);
                } catch (e) {
                    console.error('绘制投射物错误:', e);
                }
            }

            // 绘制敌人投射物
            for (const projectile of this.enemyProjectiles) {
                try {
                    projectile.draw(this.ctx, cameraOffsetX, cameraOffsetY);
                } catch (e) {
                    console.error('绘制敌人投射物错误:', e);
                }
            }

            // 绘制粒子效果
            for (const particle of this.particles) {
                try {
                    particle.draw(this.ctx, cameraOffsetX, cameraOffsetY);
                } catch (e) {
                    console.error('绘制粒子效果错误:', e);
                }
            }

            // 绘制UI
            try {
                this.draw2DUI();
            } catch (e) {
                console.error('绘制UI错误:', e);
            }

            if (this.isGameOver) {
                try {
                    this.drawGameOver();
                } catch (e) {
                    console.error('绘制游戏结束画面错误:', e);
                }
            } else if (this.isPaused) {
                try {
                    this.drawPaused();
                } catch (e) {
                    console.error('绘制暂停画面错误:', e);
                }
            }
        } catch (e) {
            console.error('2D渲染主循环错误:', e);
        }
    }

    drawBackground(cameraOffsetX, cameraOffsetY) {
        // 绘制草地纹理背景
        if (this.images.grassTexture) {
            const patternSize = 128;
            // const startX =
            //     Math.floor(this.player.x / patternSize) * patternSize;
            // const startY =
            //     Math.floor(this.player.y / patternSize) * patternSize;

            try {
                // 创建草地纹理模式
                const pattern = this.ctx.createPattern(
                    this.images.grassTexture,
                    'repeat'
                );
                this.ctx.fillStyle = pattern;

                // 尝试禁用图像平滑，可能改善拼接处的模糊问题
                this.ctx.imageSmoothingEnabled = false;

                // 绘制足够覆盖整个画布的草地纹理
                this.ctx.save();
                this.ctx.translate(
                    cameraOffsetX % patternSize,
                    cameraOffsetY % patternSize
                );
                this.ctx.fillRect(
                    -patternSize,
                    -patternSize,
                    this.canvas2d.width + 2 * patternSize,
                    this.canvas2d.height + 2 * patternSize
                );
                this.ctx.restore();
                
                // 恢复图像平滑设置 (如果其他地方需要的话)
                this.ctx.imageSmoothingEnabled = true; 

                // 添加暗色叠加，创造恶魔城般的阴暗氛围
                this.ctx.fillStyle = 'rgba(20, 20, 40, 0.3)';
                this.ctx.fillRect(0, 0, this.canvas2d.width, this.canvas2d.height);
            } catch (e) {
                console.error('创建或绘制草地纹理模式时出错:', e);
                // Fallback if createPattern fails even with loaded image
                this.drawFallbackBackground();
            }
        } else {
            // 后备方案：绘制简单的颜色背景
            this.drawFallbackBackground();
        }

        // 绘制背景网格（淡化）
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;

        const gridSize = 64;

        // 计算网格起始位置（考虑偏移）
        const gridStartX = cameraOffsetX % gridSize; // Renamed from startX
        const gridStartY = cameraOffsetY % gridSize; // Renamed from startY

        // 绘制垂直线
        for (let x = gridStartX; x <= this.canvas2d.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas2d.height);
            this.ctx.stroke();
        }

        // 绘制水平线
        for (let y = gridStartY; y <= this.canvas2d.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas2d.width, y);
            this.ctx.stroke();
        }

        // 绘制背景装饰物
        this.drawBackgroundObjects(cameraOffsetX, cameraOffsetY);
    }

    drawFallbackBackground() {
        this.ctx.fillStyle = '#1a5c1a'; // 深绿色草地
        this.ctx.fillRect(0, 0, this.canvas2d.width, this.canvas2d.height);
    }

    drawBackgroundObjects(cameraOffsetX, cameraOffsetY) {
        // 根据层级排序背景对象
        const sortedObjects = [...this.backgroundObjects].sort(
            (a, b) => a.layer - b.layer
        );

        for (const obj of sortedObjects) {
            // 计算屏幕坐标
            const screenX = obj.x + cameraOffsetX;
            const screenY = obj.y + cameraOffsetY;

            // 只绘制屏幕附近的对象（性能优化）
            if (
                screenX > -200 &&
                screenX < this.canvas2d.width + 200 &&
                screenY > -200 &&
                screenY < this.canvas2d.height + 200
            ) {
                // 特殊处理火炬
                if (obj.type === 'torch') {
                    // 更新火把动画
                    if (this.frameCount % 10 === 0) {
                        obj.animationFrame = (obj.animationFrame + 1) % 4;
                    }

                    // 获取图像
                    const image = this.images.torch;
                    if (image) {
                        // 计算缩放后的尺寸
                        const scale = obj.scale || 0.3;
                        const width = image.width * scale;
                        const height = image.height * scale;

                        // 绘制火把本身
                        this.ctx.save();
                        this.ctx.translate(screenX, screenY);
                        this.ctx.drawImage(
                            image,
                            0,
                            0,
                            image.width,
                            image.height,
                            -width / 2,
                            -height,
                            width,
                            height
                        );

                        // 绘制火焰光晕效果
                        const glowRadius =
                            30 * scale +
                            Math.sin(this.frameCount * 0.1) * (10 * scale);
                        const gradient = this.ctx.createRadialGradient(
                            0,
                            -height / 2,
                            5 * scale,
                            0,
                            -height / 2,
                            glowRadius
                        );
                        gradient.addColorStop(0, 'rgba(255, 150, 50, 0.6)');
                        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');

                        this.ctx.globalAlpha = 0.7;
                        this.ctx.fillStyle = gradient;
                        this.ctx.beginPath();
                        this.ctx.arc(
                            0,
                            -height / 2,
                            glowRadius,
                            0,
                            Math.PI * 2
                        );
                        this.ctx.fill();
                        this.ctx.restore();
                    }
                }
                // 其他背景对象的渲染
                else if (obj.image && this.images[obj.image]) {
                    const img = this.images[obj.image];
                    const width = obj.width || img.width;
                    const height = obj.height || img.height;

                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.rotate(obj.rotation || 0);
                    this.ctx.globalAlpha = obj.opacity || 1;

                    this.ctx.drawImage(
                        img,
                        -width / 2,
                        -height / 2,
                        width,
                        height
                    );

                    this.ctx.restore();
                } else if (obj.type && this.images[obj.type]) {
                    const img = this.images[obj.type];
                    const scale = obj.scale || 1;
                    const width = (obj.width || img.width) * scale;
                    const height = (obj.height || img.height) * scale;

                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.rotate(obj.rotation || 0);
                    this.ctx.globalAlpha = obj.opacity || 1;

                    this.ctx.drawImage(
                        img,
                        -width / 2,
                        -height / 2,
                        width,
                        height
                    );

                    this.ctx.restore();
                }
            }
        }
    }

    drawBoundary() {
        const boundary = 1000; // 与玩家边界限制相同
        const cameraOffsetX = this.canvas2d.width / 2 - this.player.x;
        const cameraOffsetY = this.canvas2d.height / 2 - this.player.y;

        // 设置边界线样式
        this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]); // 虚线效果

        // 绘制边界矩形
        this.ctx.beginPath();
        this.ctx.rect(
            -boundary + cameraOffsetX,
            -boundary + cameraOffsetY,
            boundary * 2,
            boundary * 2
        );
        this.ctx.stroke();
        this.ctx.setLineDash([]); // 重置虚线设置
    }

    draw2DUI() {
        // 确保UI画布上下文存在
        if (!this.ctxUI) {
            console.warn('UI上下文不存在');
            return;
        }

        // 清除旧的UI内容
        this.ctxUI.clearRect(0, 0, this.canvasUI.width, this.canvasUI.height);

        // 绘制玩家UI（生命、经验等）
        this.player.drawUI(this.ctxUI);

        // 绘制游戏时间
        this.ctxUI.fillStyle = '#fff';
        this.ctxUI.font = '16px Arial';
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        this.ctxUI.fillText(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            this.canvasUI.width - 70,
            30
        );

        // 绘制游戏等级
        this.ctxUI.fillText(
            `难度: ${this.gameLevel}`,
            this.canvasUI.width - 70,
            50
        );

        // 绘制敌人数量
        this.ctxUI.fillText(
            `敌人: ${this.enemies.length}`,
            this.canvasUI.width - 70,
            70
        );

        // 绘制警告文本
        if (this.warningTimer > 0) {
            const alpha = Math.min(1, this.warningTimer / 60);
            this.ctxUI.globalAlpha = alpha;
            this.ctxUI.fillStyle = '#ff0000';
            this.ctxUI.font = '24px Arial';
            this.ctxUI.textAlign = 'center';
            this.ctxUI.fillText(this.warningText, this.canvasUI.width / 2, 100);
            this.ctxUI.textAlign = 'left';
            this.ctxUI.globalAlpha = 1;
        }
    }

    drawPaused() {
        // 确保UI画布上下文存在
        if (!this.ctxUI) {
            // 尝试初始化或获取UI上下文
            try {
                const canvasUI = document.getElementById('game-canvas-ui');
                if (canvasUI) {
                    this.canvasUI = canvasUI;
                    this.ctxUI = canvasUI.getContext('2d');
                    console.log('已重新获取UI上下文');
                }
            } catch (e) {
                console.warn('无法获取或初始化UI上下文:', e);
            }
            
            // 如果仍然无法获取UI上下文，尝试使用当前活动的Canvas
            if (!this.ctxUI) {
                if (this.is3D) {
                    const canvas3d = document.getElementById('game-canvas-3d');
                    if (canvas3d) {
                        this.ctxUI = this.ctx; // 使用2D上下文作为备用
                        this.canvasUI = this.canvas2d;
                        console.warn('使用2D上下文作为UI上下文的备用');
                    }
                } else {
                    this.ctxUI = this.ctx;
                    this.canvasUI = this.canvas2d;
                }
            }
            
            // 如果仍然无法获取UI上下文，退出
            if (!this.ctxUI) {
                console.warn('UI上下文不存在且无法初始化');
                return;
            }
        }

        // 只有在游戏真正暂停且不在升级界面时显示暂停信息
        if (this.isPaused && this.levelUpElement.classList.contains('hidden')) {
            // 半透明黑色覆盖
            this.ctxUI.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctxUI.fillRect(
                0,
                0,
                this.canvasUI.width,
                this.canvasUI.height
            );

            // 暂停文本
            this.ctxUI.fillStyle = '#fff';
            this.ctxUI.font = '48px Arial';
            this.ctxUI.textAlign = 'center';
            this.ctxUI.fillText(
                '游戏暂停',
                this.canvasUI.width / 2,
                this.canvasUI.height / 2
            );

            // 继续提示
            this.ctxUI.font = '20px Arial';
            this.ctxUI.fillText(
                '按 P 键继续游戏',
                this.canvasUI.width / 2,
                this.canvasUI.height / 2 + 50
            );

            this.ctxUI.textAlign = 'left';
        }
    }

    spawnEnemy() {
        // 在玩家周围一定范围外生成敌人
        const minDistance = 250; // 敌人生成的最小距离
        const maxDistance = 500; // 敌人生成的最大距离
        const angle = Math.random() * Math.PI * 2;
        const distance =
            minDistance + Math.random() * (maxDistance - minDistance);
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;

        // 根据游戏等级选择可用的敌人类型
        const availableEnemies = this.enemyTypes.filter(
            (enemy) => enemy.minGameLevel <= this.gameLevel
        );

        // 按权重随机选择敌人类型
        const totalWeight = availableEnemies.reduce(
            (sum, enemy) => sum + enemy.weight,
            0
        );
        let random = Math.random() * totalWeight;
        let enemyType = availableEnemies[0].type;

        for (const enemy of availableEnemies) {
            random -= enemy.weight;
            if (random <= 0) {
                enemyType = enemy.type;
                break;
            }
        }

        // 创建敌人
        const enemy = new enemyType({
            x: x,
            y: y,
            target: this.player,
            level: this.gameLevel,
        });

        // 应用难度调整
        enemy.health *= this.difficultyMultiplier;
        enemy.damage *= this.attackMultiplier;

        this.enemies.push(enemy);
    }

    createProjectile(options) {
        this.projectiles.push(new Projectile(options));
    }

    createEnemyProjectile(options) {
        this.enemyProjectiles.push(new Projectile(options));
    }

    createExp(x, y, value) {
        this.expOrbs.push(new ExperienceOrb(x, y, value));
    }

    createParticle(x, y, color, size, lifetime) {
        this.particles.push(new Particle(x, y, color, size, lifetime));
    }

    createEffect(options) {
        this.effects.push(new Effect(options));
        
        // 在3D模式下，使用ThreeHelper创建对应的3D特效
        if (this.is3D && this.threeHelper) {
            // 根据效果类型创建不同的3D特效
            if (options.color === '#80c0ff' || options.color === '#a0d0ff') {
                // 这是冲刺效果
                if (options.color === '#80c0ff') {
                    // 初始冲刺特效
                    this.threeHelper.createDashEffect(options.x, options.y, options.radius, options.color);
                } else {
                    // 冲刺残影
                    this.threeHelper.createAfterImageEffect(options.x, options.y, options.radius, options.color);
                }
            } else if (options.color === '#ff0000') {
                // 受伤效果
                // TODO: 可以添加受伤特效的3D实现
            }
        }
    }

    createAlly(options) {
        // Temporarily disable Ally creation
        console.warn('Ally creation is temporarily disabled.');
        // this.allies.push(new Ally(options));
    }

    showWarning(text, duration = 120) {
        this.warningText = text;
        this.warningTimer = duration;
        console.log(`显示警告: ${text} (持续 ${duration} 帧)`);
        
        // 如果正在加载3D模式，显示更详细的加载状态
        if (text.includes('加载3D模式')) {
            if (!this._showLoading3DStatus) {
                this._showLoading3DStatus = true;
                this._loadingTimestamp = Date.now();
                
                // 定期更新加载状态
                this._updateLoadingInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this._loadingTimestamp) / 1000);
                    this.warningText = `正在加载3D模式...${elapsed}秒`;
                    this.warningTimer = 5; // 保持显示
                    
                    // 如果已经加载完成或超时，清除定时器
                    if (this.threeHelperLoaded || elapsed > 30) {
                        clearInterval(this._updateLoadingInterval);
                        this._showLoading3DStatus = false;
                    }
                }, 1000);
            }
        } else if (text.includes('3D模式已加载')) {
            // 清除加载状态更新
            if (this._updateLoadingInterval) {
                clearInterval(this._updateLoadingInterval);
                this._showLoading3DStatus = false;
            }
        }
    }

    increaseDifficulty() {
        this.gameLevel++;
        // 增加属性提升幅度，特别是攻击力
        this.difficultyMultiplier = 1 + (this.gameLevel - 1) * 0.1; // 基础属性乘数（生命值等）
        this.attackMultiplier = 1 + (this.gameLevel - 1) * 0.2; // 攻击力乘数更高

        // 降低怪物数量的增长速度，从每级-40帧改为每级-20帧
        this.enemySpawnRate = Math.max(10, 120 - (this.gameLevel - 1) * 20);
        // 降低最大敌人数量的增长速度，从每级+40个改为每级+20个
        this.maxEnemies = Math.min(400, 50 + (this.gameLevel - 1) * 20);
    }

    showWeaponSelection() {
        // 暂停游戏
        this.isPaused = true;

        // 清空武器选择区域
        this.weaponChoicesElement.innerHTML = '';

        // 从武器库中随机选择3种武器
        let availableWeapons = [...WeaponsLibrary];
        let weaponChoices = Utils.getRandomElements(availableWeapons, 3);

        // 创建武器选择界面
        for (const WeaponClass of weaponChoices) {
            const existingWeapon = this.player.weapons.find(
                (w) => w instanceof WeaponClass
            );
            const weapon = new WeaponClass();

            const weaponElement = document.createElement('div');
            weaponElement.className = 'weapon-choice';

            let weaponInfo;
            if (existingWeapon) {
                weaponInfo = `
                    <h3>${weapon.name} Lv${existingWeapon.level + 1}</h3>
                    <p>${weapon.description}</p>
                    <p>伤害: ${weapon.baseDamage * (existingWeapon.level + 1)}</p>
                `;
            } else {
                weaponInfo = `
                    <h3>${weapon.name} Lv1</h3>
                    <p>${weapon.description}</p>
                    <p>伤害: ${weapon.baseDamage}</p>
                `;
            }

            weaponElement.innerHTML = weaponInfo;

            // 点击武器选择
            weaponElement.addEventListener('click', () => {
                this.player.addWeapon(WeaponClass);
                this.closeWeaponSelection();
            });

            this.weaponChoicesElement.appendChild(weaponElement);
        }

        // 显示武器选择界面
        this.levelUpElement.classList.remove('hidden');
    }

    closeWeaponSelection() {
        // 隐藏武器选择界面
        this.levelUpElement.classList.add('hidden');

        // 恢复游戏
        this.isPaused = false;
    }

    gameOver() {
        this.isGameOver = true;
        this.isRunning = false;
    }

    restart() {
        console.log('重新开始游戏');
        
        // 清理资源
        this.dispose();
        
        // 重新初始化游戏
        this.isGameOver = false;
        this.isPaused = false;
        this.frameCount = 0;
        this.gameTime = 0;
        
        // 清空游戏元素
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.effects = [];
        this.expOrbs = [];
        
        // 重置难度
        this.gameLevel = 1;
        this.difficultyMultiplier = 1;
        this.attackMultiplier = 1;
        this.enemySpawnRate = 60;
        this.maxEnemies = 100;
        
        // 重置玩家
        this.player = new Player(this);
        
        // 初始化时添加基础武器
        this.player.addWeapon(WeaponsLibrary[0]);
        
        // 重新加载背景对象
        this.generateBackgroundObjects();
        
        // 重新初始化3D模式（如果当前是3D模式）
        if (this.is3D && this.threeHelper) {
            this.threeHelper.reset();
        }
        
        // 重新设置事件
        this.setupAllEventListeners();
        
        // 开始游戏
        this.start();
        
        // 添加一些初始敌人
        for (let i = 0; i < 5; i++) {
            this.spawnEnemy();
        }

        // 游戏重启后重新设置resize事件监听器
        this.resizeHandler = () => {
            this.resize();
        };
        
        window.addEventListener('resize', this.resizeHandler);
        
        // 调用一次resize确保正确尺寸
        setTimeout(() => {
            this.resize();
        }, 100);
    }
    
    // 清理游戏资源
    dispose() {
        console.log('清理游戏资源...');
        
        // 停止游戏循环
        this.isRunning = false;
        
        // 移除窗口大小变化的事件监听器
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        // 移除键盘和鼠标事件监听器
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
        this.removeEventListeners(this.canvas2d);
        this.removeEventListeners(this.canvas3d);
        
        // 清理3D资源
        if (this.threeHelper) {
            try {
                this.threeHelper.dispose();
            } catch (e) {
                console.error('清理ThreeHelper失败:', e);
            }
            this.threeHelper = null;
        }
        
        console.log('游戏资源清理完成');
    }

    // 生成恶魔城风格的背景元素
    generateBackgroundObjects() {
        // 添加一些远处的城堡塔楼
        for (let i = 0; i < 3; i++) {
            this.backgroundObjects.push({
                type: 'castleTower',
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                scale: 0.7 + Math.random() * 0.6,
                layer: 0, // 最远的层
                height: 120,
            });
        }

        // 添加一些破碎的石柱
        for (let i = 0; i < 20; i++) {
            this.backgroundObjects.push({
                type: 'brokenPillar',
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                scale: 0.3 + Math.random() * 0.4,
                layer: 1,
            });
        }

        // 添加一些墓碑
        for (let i = 0; i < 30; i++) {
            this.backgroundObjects.push({
                type: 'gravestone',
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                scale: 0.2 + Math.random() * 0.3,
                layer: 1,
            });
        }

        // 添加一些枯树
        for (let i = 0; i < 15; i++) {
            this.backgroundObjects.push({
                type: 'deadTree',
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                scale: 0.4 + Math.random() * 0.6,
                layer: 1,
            });
        }

        // 添加一些火把
        for (let i = 0; i < 25; i++) {
            this.backgroundObjects.push({
                type: 'torch',
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                scale: 0.3 + Math.random() * 0.2,
                layer: 2,
                animationFrame: Math.floor(Math.random() * 4), // 火把动画帧
            });
        }
    }

    // 添加测试按钮生成敌人
    addTestButton() {
        // 不再创建按钮，通过键盘快捷键来测试
        console.log('注册测试功能快捷键');
        
        // 添加全局快捷键测试函数
        window.testEnemySpawn = () => {
            // 在玩家前方生成一个敌人
            const angle = Math.random() * Math.PI * 2;
            const distance = 150;
            const x = this.player.x + Math.cos(angle) * distance;
            const y = this.player.y + Math.sin(angle) * distance;

            const enemyType = EnemyLibrary.Zombie;
            // 创建一个自定义僵尸，确保100%掉落经验
            const enemy = new enemyType({
                x: x,
                y: y,
                target: this.player,
                level: Math.max(1, this.gameLevel), // 使用游戏当前等级
                expValue: 5, // 增加经验值奖励
            });

            this.enemies.push(enemy);

            // 同时生成一些经验球（测试用）
            this.createExp(x - 50, y, 1);
            this.createExp(x + 50, y, 1);
            
            this.showWarning('已生成测试敌人', 60);
        };
        
        // 添加测试纹理加载功能
        window.testTextureLoading = () => {
            // 重新加载纹理
            this.images = {};
            console.log('重新开始生成图片...');
            this.images.grassTexture = generateGrassTexture();
            this.images.castleTower = generateCastleTowerTexture();
            this.images.brokenPillar = generateBrokenPillarTexture();
            this.images.gravestone = generateGravestoneTexture();
            this.images.deadTree = generateDeadTreeTexture();
            this.images.torch = generateTorchTexture();
            console.log('所有图片重新生成完毕。');
            
            // 重新生成背景对象
            this.generateBackgroundObjects();
            
            this.showWarning('纹理已重新加载', 60);
        };
    }

    // 设置所有事件监听器
    setupAllEventListeners() {
        console.log('设置所有事件监听器');
        
        // 清除之前的键盘事件监听器
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
        
        // 初始化键盘映射
        this.keys = {
            'ArrowUp': false,
            'ArrowDown': false,
            'ArrowLeft': false,
            'ArrowRight': false,
            'w': false,
            'a': false,
            's': false,
            'd': false,
            'W': false,
            'A': false,
            'S': false,
            'D': false,
            'up': false,
            'down': false,
            'left': false,
            'right': false,
            ' ': false, // 空格键
            'shift': false,
            'Shift': false
        };
        
        // 设置键盘事件
        this._handleKeyDown = (e) => {
            // 直接用键名作为索引
            this.keys[e.key] = true;
            
            // 方向键和WASD特殊处理，同时更新方向别名
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.keys.up = true;
                this.keys.ArrowUp = true;
                this.keys.w = true;
                this.keys.W = true;
            }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.keys.down = true;
                this.keys.ArrowDown = true;
                this.keys.s = true;
                this.keys.S = true;
            }
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.keys.left = true;
                this.keys.ArrowLeft = true;
                this.keys.a = true;
                this.keys.A = true;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.keys.right = true;
                this.keys.ArrowRight = true;
                this.keys.d = true;
                this.keys.D = true;
            }
            if (e.key === 'Shift') {
                this.keys.shift = true;
                this.keys.Shift = true;
            }
            
            // 控制暂停
            if (e.key === 'p' || e.key === 'P') {
                this.isPaused = !this.isPaused;
                console.log('暂停状态:', this.isPaused);
            }
            
            // 用G键切换3D/2D模式
            if ((e.key === 'g' || e.key === 'G') && this.imagesReady) {
                console.log('按下G键，切换模式');
                this.toggleMode();
            }
            
            // 在游戏结束状态，按空格键重新开始游戏
            if (e.key === ' ' && this.isGameOver) {
                this.restart();
            }
            
            // 测试功能快捷键
            if (e.key === '1' && window.testEnemySpawn) {
                window.testEnemySpawn();
            }
            
            if (e.key === '2' && window.testTextureLoading) {
                window.testTextureLoading();
            }
        };
        
        this._handleKeyUp = (e) => {
            // 直接用键名作为索引
            this.keys[e.key] = false;
            
            // 方向键和WASD特殊处理，同时更新方向别名
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.keys.up = false;
                this.keys.ArrowUp = false;
                this.keys.w = false;
                this.keys.W = false;
            }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.keys.down = false;
                this.keys.ArrowDown = false;
                this.keys.s = false;
                this.keys.S = false;
            }
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.keys.left = false;
                this.keys.ArrowLeft = false;
                this.keys.a = false;
                this.keys.A = false;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.keys.right = false;
                this.keys.ArrowRight = false;
                this.keys.d = false;
                this.keys.D = false;
            }
            if (e.key === 'Shift') {
                this.keys.shift = false;
                this.keys.Shift = false;
            }
        };
        
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
        
        // 设置鼠标事件
        this.setupMouseEvents();
    }

    // 调整画布大小的方法
    resize() {
        // 只在游戏正在运行时才进行调整
        if (!this.isRunning) return;
        
        console.log('调整画布大小...');
        
        // 获取父元素或窗口的尺寸
        const newWidth = this.canvas2d.parentElement ? this.canvas2d.parentElement.clientWidth : window.innerWidth;
        const newHeight = this.canvas2d.parentElement ? this.canvas2d.parentElement.clientHeight : window.innerHeight;
        
        // 调整2D画布尺寸
        this.canvas2d.width = newWidth;
        this.canvas2d.height = newHeight;
        
        // 同步调整UI Canvas尺寸
        if (this.canvasUI) {
            this.canvasUI.width = newWidth;
            this.canvasUI.height = newHeight;
            // 尝试重新获取UI上下文
            if (!this.ctxUI) {
                this.ctxUI = this.canvasUI.getContext('2d', { willReadFrequently: true });
            }
        }
        
        // 调整3D画布尺寸（如果不在3D模式下，ThreeHelper会在切换到3D模式时自动调整）
        if (this.is3D && this.threeHelper) {
            // 使用ThreeHelper的resize方法
            this.threeHelper.resize(newWidth, newHeight);
        }
        
        // 触发重绘
        if (this.is3D) {
            if (this.threeHelper && this.threeHelper.renderer) {
                this.threeHelper.render();
            }
        } else {
            this.draw2D();
        }
    }
}

// 初始化游戏函数
function initGame() {
    console.log('初始化游戏...');
    
    // 创建游戏实例（默认以2D模式启动）
    game = new Game();
    
    // 先启动游戏（2D模式）
    game.start();
    
    // 确保所有事件监听器都被设置
    game.setupAllEventListeners();
    
    // 添加一些初始敌人
    for (let i = 0; i < 5; i++) {
        game.spawnEnemy();
    }
}
