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
            // 设置UI Canvas尺寸
            this.canvasUI.width = 800;
            this.canvasUI.height = 600;
            this.ctxUI = this.canvasUI.getContext('2d', {
                willReadFrequently: true,
            });
        }

        // 3D支持
        this.is3D = true; // 默认从3D模式开始

        this.frameCount = 0;
        this.gameTime = 0;
        this.isRunning = false;
        this.isGameOver = false;
        this.isPaused = false;

        // 设置Canvas尺寸
        this.canvas2d.width = 800;
        this.canvas2d.height = 600;
        this.canvas3d.width = 800;
        this.canvas3d.height = 600;

        // 初始化2D上下文
        this.ctx = this.canvas2d.getContext('2d', { willReadFrequently: true });

        // 显示正确的Canvas
        this.updateCanvasVisibility();

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

        // 为3D画布设置事件监听器
        this.setupCanvas3dEvents();
    }

    // 更新Canvas显示状态
    updateCanvasVisibility() {
        // 获取canvas元素，确保它们存在
        let canvas2d = document.getElementById('game-canvas');
        let canvas3d = document.getElementById('game-canvas-3d');

        if (canvas2d && canvas3d) {
            if (this.is3D) {
                // 3D模式：3D canvas活跃，2D canvas不活跃
                canvas2d.classList.remove('active');
                canvas2d.classList.add('inactive');
                canvas3d.classList.remove('inactive');
                canvas3d.classList.add('active');
            } else {
                // 2D模式：2D canvas活跃，3D canvas不活跃
                canvas3d.classList.remove('active');
                canvas3d.classList.add('inactive');
                canvas2d.classList.remove('inactive');
                canvas2d.classList.add('active');
            }
            console.log(
                `Canvas可见性更新: 2D ${this.is3D ? '隐藏' : '显示'}, 3D ${this.is3D ? '显示' : '隐藏'}`
            );
        } else {
            console.warn('无法更新Canvas可见性，Canvas元素不存在');
        }
    }

    // 切换3D/2D模式
    toggleMode() {
        // 如果图像尚未全部加载，显示提示并取消切换
        if (!this.imagesReady) {
            this.showWarning('图像资源尚未加载完成，请稍后再试', 180);
            return;
        }

        // 如果当前是3D模式，先清理3D资源
        if (this.is3D && this.threeHelper) {
            this.threeHelper.dispose();
            this.threeHelper = null;
        }

        // 切换模式标志
        this.is3D = !this.is3D;

        // 更新Canvas引用和可见性
        this.canvas2d = document.getElementById('game-canvas');
        this.canvas3d = document.getElementById('game-canvas-3d');

        // 确保两个Canvas都存在
        this.updateCanvasVisibility();

        // 如果切换到3D模式，需要重新创建3D渲染器
        if (this.is3D && !this.threeHelper) {
            // 动态导入ThreeHelper
            import('./three-helper.js').then(module => {
                console.log('重新创建3D渲染器...');
                this.threeHelper = new module.ThreeHelper(this);
                // 显式加载背景图像并创建对象
                if (this.threeHelper.loadBackgroundImages) {
                    this.threeHelper.loadBackgroundImages(true);
                }
            });
        }

        // 显示提示
        this.showWarning(this.is3D ? '已切换到3D模式' : '已切换到2D模式', 120);
    }

    init() {
        // 初始化玩家位置
        this.player.x = 0;
        this.player.y = 0;

        // 添加初始武器
        this.player.addWeapon(WeaponsLibrary[0]);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastFrameTime = performance.now();
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

            this.draw();
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

        if (this.is3D) {
            // 3D渲染逻辑
            if (!this.threeHelper) {
                console.warn('3D渲染器未创建，暂时回退到2D渲染');
                this.draw2D();
                // 无论如何都绘制UI
                this.draw2DUI();
                return;
            }

            // 确保渲染器可用
            if (!this.threeHelper.renderer) {
                console.warn('3D渲染器不可用，回退到2D渲染');
                // 防止循环报错，如果连续5次失败，自动切换回2D模式
                this.renderFailCount = (this.renderFailCount || 0) + 1;
                if (this.renderFailCount > 5) {
                    console.error('3D渲染连续失败多次，自动切换回2D模式');
                    this.is3D = false;
                    this.renderFailCount = 0;
                    this.updateCanvasVisibility();
                }
                this.draw2D();
                // 无论如何都绘制UI
                this.draw2DUI();
                return;
            }

            // 成功渲染时重置失败计数
            this.renderFailCount = 0;

            try {
                // 更新玩家位置
                this.threeHelper.updateObjectPosition(
                    'player',
                    this.player.x,
                    this.player.y
                );

                // 更新敌人位置
                this.enemies.forEach((enemy) => {
                    const key = `enemy_${enemy.id}`;
                    if (!this.threeHelper.objects.has(key)) {
                        this.threeHelper.createEnemyModel(enemy);
                    } else {
                        this.threeHelper.updateObjectPosition(
                            key,
                            enemy.x,
                            enemy.y
                        );
                    }
                });

                // 更新投射物位置
                this.projectiles
                    .concat(this.enemyProjectiles)
                    .forEach((projectile) => {
                        const key = `projectile_${projectile.id}`;
                        if (!this.threeHelper.objects.has(key)) {
                            this.threeHelper.createProjectileModel(projectile);
                        } else {
                            this.threeHelper.updateObjectPosition(
                                key,
                                projectile.x,
                                projectile.y,
                                10
                            );
                        }
                    });

                // 更新经验球位置
                this.expOrbs.forEach((orb) => {
                    const key = `expOrb_${orb.id}`;
                    if (!this.threeHelper.objects.has(key)) {
                        this.threeHelper.createExpOrbModel(orb);
                    } else {
                        this.threeHelper.updateObjectPosition(
                            key,
                            orb.x,
                            orb.y,
                            5
                        );
                    }
                });

                // 清理已经不存在的对象
                this.threeHelper.objects.forEach((_, key) => {
                    if (key.startsWith('enemy_')) {
                        const id = key.replace('enemy_', '');
                        if (!this.enemies.some((e) => e.id.toString() === id)) {
                            this.threeHelper.removeObject(key);
                        }
                    } else if (key.startsWith('projectile_')) {
                        const id = key.replace('projectile_', '');
                        if (
                            !this.projectiles.some(
                                (p) => p.id.toString() === id
                            ) &&
                            !this.enemyProjectiles.some(
                                (p) => p.id.toString() === id
                            )
                        ) {
                            this.threeHelper.removeObject(key);
                        }
                    } else if (key.startsWith('expOrb_')) {
                        const id = key.replace('expOrb_', '');
                        if (!this.expOrbs.some((o) => o.id.toString() === id)) {
                            this.threeHelper.removeObject(key);
                        }
                    }
                });

                // 渲染3D场景
                this.threeHelper.render();

                // 在3D场景上绘制UI
                this.draw2DUI();

                if (this.isGameOver) {
                    this.drawGameOver();
                } else if (this.isPaused) {
                    this.drawPaused();
                }
            } catch (e) {
                console.error('3D渲染错误，回退到2D渲染', e);
                // 如果渲染过程中出错，记录错误
                this.renderErrorCount = (this.renderErrorCount || 0) + 1;
                if (this.renderErrorCount > 3) {
                    console.error('3D渲染出错多次，自动切换回2D模式');
                    this.is3D = false;
                    this.renderErrorCount = 0;
                    this.updateCanvasVisibility();
                }
                this.draw2D();
                // 无论如何都绘制UI
                this.draw2DUI();
            }

            return;
        }

        // 2D渲染逻辑
        this.draw2D();

        // 无论在哪种模式下，都绘制UI
        this.draw2DUI();
        
        // 检查游戏是否结束或暂停，并绘制对应的UI
        if (this.isGameOver) {
            this.drawGameOver();
        } else if (this.isPaused) {
            this.drawPaused();
        }
    }

    // 2D渲染逻辑
    draw2D() {
        try {
            // 确保2D上下文存在
            if (!this.ctx) {
                this.ctx = this.canvas2d.getContext('2d', {
                    willReadFrequently: true,
                });
                if (!this.ctx) {
                    console.error('无法获取2D上下文');
                    return;
                }
            }

            // 清除屏幕
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
            console.warn('UI上下文不存在');
            return;
        }

        // 仅在非武器选择屏幕时显示暂停信息
        if (this.levelUpElement.classList.contains('hidden')) {
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

    showWarning(text, duration = 180) {
        this.warningText = text;
        this.warningTimer = duration;
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
        // 重置游戏状态
        this.isGameOver = false;
        this.isPaused = false;
        this.gameTime = 0;
        this.frameCount = 0;
        this.difficultyMultiplier = 1;
        this.attackMultiplier = 1;
        this.enemySpawnRate = 60;
        this.maxEnemies = 100;

        // 清空游戏元素
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.effects = [];
        this.expOrbs = [];

        // 重新生成背景对象（保持一致的背景）
        // 保持backgroundObjects不变，只需在3D模式下重新创建对应的3D对象

        // 重置玩家
        this.player = new Player(this);
        this.player.x = 0;
        this.player.y = 0;
        this.player.addWeapon(WeaponsLibrary[0]);

        // 重置3D场景
        if (this.is3D && this.threeHelper) {
            this.threeHelper.reset();
        }

        // 添加初始敌人
        for (let i = 0; i < 5; i++) {
            this.spawnEnemy();
        }

        // 重新开始
        if (!this.isRunning) {
            this.start();
        }
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
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.top = '10px';
        buttonContainer.style.right = '10px';
        buttonContainer.style.zIndex = '1000';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';

        // 创建生成敌人测试按钮
        const enemyButton = document.createElement('button');
        enemyButton.textContent = '生成测试敌人';

        enemyButton.addEventListener('click', () => {
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
        });

        // 创建纹理测试按钮
        const textureButton = document.createElement('button');
        textureButton.textContent = '测试纹理加载';

        textureButton.addEventListener('click', () => {
            // 调用全局的testImageVisibility函数
            if (window.testImageVisibility) {
                window.testImageVisibility();
            } else {
                console.error('testImageVisibility函数不存在');
            }
        });

        // 添加按钮到容器
        buttonContainer.appendChild(enemyButton);
        buttonContainer.appendChild(textureButton);

        // 添加容器到文档
        document.body.appendChild(buttonContainer);
    }

    // 为canvas3d设置事件监听器
    setupCanvas3dEvents() {
        if (!this.canvas3d) return;

        // 移除所有现有事件监听器（如果有的话）
        // 注意：这里使用新函数是因为无法移除匿名函数
        this.canvas3d.onmousedown = null;
        this.canvas3d.onmousemove = null;
        this.canvas3d.oncontextmenu = null;
        this.canvas3d.ontouchstart = null;
        this.canvas3d.ontouchmove = null;
        this.canvas3d.ontouchend = null;

        console.log('为canvas3d设置事件监听器');

        // 鼠标按下事件
        this.canvas3d.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                // 左键
                this.isDragging = true;
                // 记录拖动开始的位置
                const rect = this.canvas3d.getBoundingClientRect();
                this.dragStartX = e.clientX - rect.left;
                this.dragStartY = e.clientY - rect.top;
                this.dragStartPlayerX = this.player.x;
                this.dragStartPlayerY = this.player.y;
                console.log(
                    '3D canvas mousedown',
                    this.dragStartX,
                    this.dragStartY
                );
            }
        });

        // 鼠标移动事件
        this.canvas3d.addEventListener('mousemove', (e) => {
            // 获取鼠标相对于canvas的位置
            const rect = this.canvas3d.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        // 阻止右键菜单
        this.canvas3d.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // 触摸开始事件
        this.canvas3d.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                this.isDragging = true;

                const rect = this.canvas3d.getBoundingClientRect();
                this.mouseX = e.touches[0].clientX - rect.left;
                this.mouseY = e.touches[0].clientY - rect.top;

                // 记录拖动开始的位置
                this.dragStartX = this.mouseX;
                this.dragStartY = this.mouseY;
                this.dragStartPlayerX = this.player.x;
                this.dragStartPlayerY = this.player.y;
                console.log(
                    '3D canvas touchstart',
                    this.dragStartX,
                    this.dragStartY
                );
            }
        });

        // 触摸移动事件
        this.canvas3d.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const rect = this.canvas3d.getBoundingClientRect();
                this.mouseX = e.touches[0].clientX - rect.left;
                this.mouseY = e.touches[0].clientY - rect.top;
            }
        });

        // 触摸结束事件
        this.canvas3d.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isDragging = false;
            // 清除拖动的起始位置
            this.dragStartX = null;
            this.dragStartY = null;
            this.dragStartPlayerX = null;
            this.dragStartPlayerY = null;
        });
    }

    drawGameOver() {
        // 确保UI画布上下文存在
        if (!this.ctxUI) {
            console.warn('UI上下文不存在');
            return;
        }

        // 半透明黑色覆盖
        this.ctxUI.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctxUI.fillRect(0, 0, this.canvasUI.width, this.canvasUI.height);

        // 游戏结束文本
        this.ctxUI.fillStyle = '#fff';
        this.ctxUI.font = '48px Arial';
        this.ctxUI.textAlign = 'center';
        this.ctxUI.fillText(
            '游戏结束',
            this.canvasUI.width / 2,
            this.canvasUI.height / 2 - 50
        );

        // 显示存活时间
        this.ctxUI.font = '24px Arial';
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        this.ctxUI.fillText(
            `存活时间: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            this.canvasUI.width / 2,
            this.canvasUI.height / 2
        );

        // 显示等级
        this.ctxUI.fillText(
            `最终等级: ${this.player.level}`,
            this.canvasUI.width / 2,
            this.canvasUI.height / 2 + 40
        );

        // 重新开始提示
        this.ctxUI.font = '20px Arial';
        this.ctxUI.fillText(
            '按空格键重新开始',
            this.canvasUI.width / 2,
            this.canvasUI.height / 2 + 100
        );

        this.ctxUI.textAlign = 'left';
    }
}
