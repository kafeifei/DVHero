class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.frameCount = 0;
        this.gameTime = 0;
        this.isRunning = false;
        this.isGameOver = false;
        this.isPaused = false;
        
        // 帧率控制
        this.fps = 60;
        this.fpsInterval = 1000 / this.fps;
        this.lastFrameTime = 0;
        
        // 游戏资源
        this.images = {};
        this.loadImages();
        
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
        this.allies = [];
        
        // 等级和难度设置
        this.gameLevel = 1;
        this.difficultyMultiplier = 1;
        this.enemySpawnRate = 120; // 每120帧生成一个敌人
        this.maxEnemies = 50;
        this.enemyTypes = [
            {type: EnemyLibrary.Zombie, weight: 100, minGameLevel: 1},
            {type: EnemyLibrary.SkeletonSoldier, weight: 80, minGameLevel: 1},
            {type: EnemyLibrary.AxeArmor, weight: 50, minGameLevel: 2},
            {type: EnemyLibrary.MedusaHead, weight: 70, minGameLevel: 3},
            {type: EnemyLibrary.BladeSoldier, weight: 40, minGameLevel: 4},
            {type: EnemyLibrary.SpearGuard, weight: 30, minGameLevel: 5},
            {type: EnemyLibrary.FireDemon, weight: 20, minGameLevel: 8},
            {type: EnemyLibrary.ValhallaKnight, weight: 15, minGameLevel: 10},
            {type: EnemyLibrary.Gorgon, weight: 10, minGameLevel: 15},
            {type: EnemyLibrary.Guardian, weight: 5, minGameLevel: 20}
        ];
        
        // UI元素
        this.levelUpElement = document.getElementById('level-up');
        this.weaponChoicesElement = document.getElementById('weapon-choices');
        this.warningText = '';
        this.warningTimer = 0;
        
        // 初始化
        this.init();
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
        if (this.frameCount % this.enemySpawnRate === 0 && this.enemies.length < this.maxEnemies) {
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
        
        // 更新盟友
        for (let i = this.allies.length - 1; i >= 0; i--) {
            const ally = this.allies[i];
            ally.update(this);
            
            if (!ally.alive) {
                this.allies.splice(i, 1);
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
            if (Utils.distance(exp.x, exp.y, this.player.x, this.player.y) < this.player.radius + exp.radius) {
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
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 计算相机偏移（使玩家居中）
        const cameraOffsetX = this.player.x - this.canvas.width / 2;
        const cameraOffsetY = this.player.y - this.canvas.height / 2;
        
        // 绘制背景
        this.drawBackground(cameraOffsetX, cameraOffsetY);
        
        // 绘制经验球
        for (const exp of this.expOrbs) {
            exp.draw(this.ctx, cameraOffsetX, cameraOffsetY);
        }
        
        // 绘制效果
        for (const effect of this.effects) {
            effect.draw(this.ctx, cameraOffsetX, cameraOffsetY);
        }
        
        // 绘制敌人投射物
        for (const projectile of this.enemyProjectiles) {
            projectile.draw(this.ctx, cameraOffsetX, cameraOffsetY);
        }
        
        // 绘制敌人
        for (const enemy of this.enemies) {
            enemy.draw(this.ctx, cameraOffsetX, cameraOffsetY);
        }
        
        // 绘制盟友
        for (const ally of this.allies) {
            ally.draw(this.ctx, cameraOffsetX, cameraOffsetY);
        }
        
        // 绘制玩家
        this.player.draw(this.ctx);
        
        // 绘制玩家投射物
        for (const projectile of this.projectiles) {
            projectile.draw(this.ctx, cameraOffsetX, cameraOffsetY);
        }
        
        // 绘制粒子
        for (const particle of this.particles) {
            particle.draw(this.ctx, cameraOffsetX, cameraOffsetY);
        }
        
        // 绘制UI
        this.drawUI();
        
        // 游戏结束画面
        if (this.isGameOver) {
            this.drawGameOver();
        }
    }
    
    drawBackground(offsetX, offsetY) {
        // 绘制草地纹理背景
        if (this.images.grassTexture && this.images.grassTexture.complete) {
            const patternSize = 128;
            const startX = Math.floor(-offsetX / patternSize) * patternSize;
            const startY = Math.floor(-offsetY / patternSize) * patternSize;
            
            // 创建草地纹理模式
            const grassPattern = this.ctx.createPattern(this.images.grassTexture, 'repeat');
            this.ctx.fillStyle = grassPattern;
            
            // 绘制足够覆盖整个画布的草地纹理
            this.ctx.save();
            this.ctx.translate(-offsetX % patternSize, -offsetY % patternSize);
            this.ctx.fillRect(-patternSize, -patternSize, this.canvas.width + 2 * patternSize, this.canvas.height + 2 * patternSize);
            this.ctx.restore();
            
            // 添加暗色叠加，创造恶魔城般的阴暗氛围
            this.ctx.fillStyle = 'rgba(20, 20, 40, 0.3)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            // 后备方案：绘制简单的颜色背景
            this.ctx.fillStyle = '#1a5c1a';  // 深绿色草地
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // 绘制背景网格（淡化）
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 64;
        
        // 计算网格起始位置（考虑偏移）
        const startX = -offsetX % gridSize;
        const startY = -offsetY % gridSize;
        
        // 绘制垂直线
        for (let x = startX; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 绘制水平线
        for (let y = startY; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // 绘制背景装饰物
        this.drawBackgroundObjects(offsetX, offsetY);
    }
    
    drawBackgroundObjects(offsetX, offsetY) {
        // 根据层级排序背景对象
        const sortedObjects = [...this.backgroundObjects].sort((a, b) => a.layer - b.layer);
        
        for (const obj of sortedObjects) {
            // 计算屏幕坐标
            const screenX = obj.x - offsetX;
            const screenY = obj.y - offsetY;
            
            // 只绘制屏幕附近的对象（性能优化）
            if (screenX < -200 || screenX > this.canvas.width + 200 || 
                screenY < -200 || screenY > this.canvas.height + 200) {
                continue;
            }
            
            const image = this.images[obj.type];
            if (image && image.complete) {
                // 根据对象类型进行特殊处理
                switch (obj.type) {
                    case 'torch':
                        // 更新火把动画
                        if (this.frameCount % 10 === 0) {
                            obj.animationFrame = (obj.animationFrame + 1) % 4;
                        }
                        
                        // 绘制火把本身
                        this.ctx.drawImage(
                            image,
                            0, 0, image.width, image.height,
                            screenX - (image.width * obj.scale) / 2,
                            screenY - (image.height * obj.scale),
                            image.width * obj.scale,
                            image.height * obj.scale
                        );
                        
                        // 绘制火焰光晕效果
                        const glowRadius = 40 + Math.sin(this.frameCount * 0.1) * 10;
                        const gradient = this.ctx.createRadialGradient(
                            screenX, screenY - (image.height * obj.scale) / 2,
                            5,
                            screenX, screenY - (image.height * obj.scale) / 2,
                            glowRadius
                        );
                        gradient.addColorStop(0, 'rgba(255, 150, 50, 0.6)');
                        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
                        
                        this.ctx.globalAlpha = 0.7;
                        this.ctx.fillStyle = gradient;
                        this.ctx.beginPath();
                        this.ctx.arc(
                            screenX,
                            screenY - (image.height * obj.scale) / 2,
                            glowRadius,
                            0,
                            Math.PI * 2
                        );
                        this.ctx.fill();
                        this.ctx.globalAlpha = 1;
                        break;
                        
                    default:
                        // 普通背景对象绘制
                        this.ctx.drawImage(
                            image,
                            screenX - (image.width * obj.scale) / 2,
                            screenY - (image.height * obj.scale),
                            image.width * obj.scale,
                            image.height * obj.scale
                        );
                        break;
                }
            }
        }
    }
    
    drawUI() {
        // 绘制玩家UI（生命、经验等）
        this.player.drawUI(this.ctx);
        
        // 绘制游戏时间
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        this.ctx.fillText(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            this.canvas.width - 70,
            30
        );
        
        // 绘制游戏等级
        this.ctx.fillText(`难度: ${this.gameLevel}`, this.canvas.width - 70, 50);
        
        // 绘制敌人数量
        this.ctx.fillText(`敌人: ${this.enemies.length}`, this.canvas.width - 70, 70);
        
        // 绘制警告文本
        if (this.warningTimer > 0) {
            const alpha = Math.min(1, this.warningTimer / 60);
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.warningText, this.canvas.width / 2, 100);
            this.ctx.textAlign = 'left';
            this.ctx.globalAlpha = 1;
        }
    }
    
    drawGameOver() {
        // 半透明黑色覆盖
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 游戏结束文本
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // 显示存活时间
        this.ctx.font = '24px Arial';
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        this.ctx.fillText(
            `存活时间: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            this.canvas.width / 2,
            this.canvas.height / 2
        );
        
        // 显示等级
        this.ctx.fillText(`最终等级: ${this.player.level}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        
        // 重新开始提示
        this.ctx.font = '20px Arial';
        this.ctx.fillText('按空格键重新开始', this.canvas.width / 2, this.canvas.height / 2 + 100);
        
        this.ctx.textAlign = 'left';
    }
    
    spawnEnemy() {
        // 在玩家周围一定范围外生成敌人
        const minDistance = 250; // 敌人生成的最小距离
        const maxDistance = 500; // 敌人生成的最大距离
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        
        // 根据游戏等级选择可用的敌人类型
        const availableEnemies = this.enemyTypes.filter(
            enemy => enemy.minGameLevel <= this.gameLevel
        );
        
        // 按权重随机选择敌人类型
        const totalWeight = availableEnemies.reduce((sum, enemy) => sum + enemy.weight, 0);
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
            target: this.player
        });
        
        // 应用难度调整
        enemy.health *= this.difficultyMultiplier;
        enemy.damage *= this.difficultyMultiplier;
        
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
    }
    
    createAlly(options) {
        this.allies.push(new Ally(options));
    }
    
    showWarning(text, duration = 180) {
        this.warningText = text;
        this.warningTimer = duration;
    }
    
    increaseDifficulty() {
        this.gameLevel++;
        this.difficultyMultiplier = 1 + (this.gameLevel - 1) * 0.1; // 每提升一级难度，敌人属性提升10%
        
        // 随着难度增加，敌人生成速度变快
        this.enemySpawnRate = Math.max(30, 120 - (this.gameLevel - 1) * 5);
        this.maxEnemies = Math.min(200, 50 + (this.gameLevel - 1) * 5);
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
            const existingWeapon = this.player.weapons.find(w => w instanceof WeaponClass);
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
        this.frameCount = 0;
        this.gameTime = 0;
        this.isRunning = false;
        this.isGameOver = false;
        this.isPaused = false;
        
        // 清空游戏元素
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.effects = [];
        this.expOrbs = [];
        this.allies = [];
        
        // 重置难度设置
        this.gameLevel = 1;
        this.difficultyMultiplier = 1;
        this.enemySpawnRate = 120;
        this.maxEnemies = 50;
        
        // 创建新玩家
        this.player = new Player(this);
        
        // 初始化游戏
        this.init();
        
        // 重新开始游戏
        this.start();
    }
    
    // 加载游戏图像资源
    loadImages() {
        // 背景图像
        this.images.grassTexture = new Image();
        this.images.grassTexture.src = 'images/grass_texture.png';
        
        // 恶魔城元素
        this.images.castleTower = new Image();
        this.images.castleTower.src = 'images/castle_tower.png';
        
        this.images.brokenPillar = new Image();
        this.images.brokenPillar.src = 'images/broken_pillar.png';
        
        this.images.gravestone = new Image();
        this.images.gravestone.src = 'images/gravestone.png';
        
        this.images.deadTree = new Image();
        this.images.deadTree.src = 'images/dead_tree.png';
        
        this.images.torch = new Image();
        this.images.torch.src = 'images/torch.png';
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
                layer: 0  // 最远的层
            });
        }
        
        // 添加一些破碎的石柱
        for (let i = 0; i < 20; i++) {
            this.backgroundObjects.push({
                type: 'brokenPillar',
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                scale: 0.3 + Math.random() * 0.4,
                layer: 1
            });
        }
        
        // 添加一些墓碑
        for (let i = 0; i < 30; i++) {
            this.backgroundObjects.push({
                type: 'gravestone',
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                scale: 0.2 + Math.random() * 0.3,
                layer: 1
            });
        }
        
        // 添加一些枯树
        for (let i = 0; i < 15; i++) {
            this.backgroundObjects.push({
                type: 'deadTree',
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                scale: 0.4 + Math.random() * 0.6,
                layer: 1
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
                animationFrame: Math.floor(Math.random() * 4)  // 火把动画帧
            });
        }
    }
}

// 投射物类
class Projectile {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.angle = options.angle || 0;
        this.speed = options.speed || 5;
        this.damage = options.damage || 1;
        this.range = options.range || 100;
        this.color = options.color || '#fff';
        this.width = options.width || 10;
        this.height = options.height || 5;
        this.piercing = options.piercing || false;
        this.knockback = options.knockback || 0;
        this.shape = options.shape || 'rect'; // rect, circle, sword, axe, rune, star
        this.rotateSpeed = options.rotateSpeed || 0;
        this.rotation = 0;
        this.duration = options.duration || null;
        this.distance = 0;
        this.active = true;
        this.onHit = options.onHit || null;
        this.onKill = options.onKill || null;
        this.type = options.type || 'normal';
        this.fixed = options.fixed || false;
        this.fixedTarget = options.fixedTarget || null;
        this.fixedOffset = options.fixedOffset || {x: 0, y: 0};
        this.returning = options.returning || false;
        this.returnAfter = options.returnAfter || 0;
        this.returnTarget = options.returnTarget || null;
        this.returnTimer = 0;
        this.homing = options.homing || false;
        this.homingTarget = options.homingTarget || null;
        this.homingStrength = options.homingStrength || 0.05;
        this.onUpdate = options.onUpdate || null;
        
        // 判定半径（用于碰撞检测）
        this.radius = Math.max(this.width, this.height) / 2;
    }
    
    update(game) {
        // 自定义更新逻辑
        if (this.onUpdate) {
            this.onUpdate(this);
        }
        
        // 更新持续时间
        if (this.duration !== null) {
            this.duration--;
            if (this.duration <= 0) {
                this.active = false;
                return;
            }
        }
        
        // 更新旋转
        if (this.rotateSpeed) {
            this.rotation += this.rotateSpeed;
        }
        
        // 固定位置的投射物（如围绕玩家的护盾）
        if (this.fixed && this.fixedTarget) {
            if (this.rotateSpeed) {
                // 如果有旋转，更新偏移位置
                const angle = Math.atan2(this.fixedOffset.y, this.fixedOffset.x) + this.rotation;
                const distance = Math.sqrt(
                    this.fixedOffset.x * this.fixedOffset.x + this.fixedOffset.y * this.fixedOffset.y
                );
                
                this.x = this.fixedTarget.x + Math.cos(angle) * distance;
                this.y = this.fixedTarget.y + Math.sin(angle) * distance;
            } else {
                // 否则直接跟随目标
                this.x = this.fixedTarget.x + this.fixedOffset.x;
                this.y = this.fixedTarget.y + this.fixedOffset.y;
            }
            return;
        }
        
        // 返回逻辑
        if (this.returning) {
            if (this.returnTimer < this.returnAfter) {
                this.returnTimer++;
            } else if (this.returnTarget) {
                // 计算回到目标的方向
                const dx = this.returnTarget.x - this.x;
                const dy = this.returnTarget.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > this.speed) {
                    // 移动向目标
                    this.angle = Math.atan2(dy, dx);
                    this.x += Math.cos(this.angle) * this.speed;
                    this.y += Math.sin(this.angle) * this.speed;
                } else {
                    // 已到达目标
                    this.active = false;
                }
                
                return;
            }
        }
        
        // 追踪逻辑
        if (this.homing && this.homingTarget && this.homingTarget.alive) {
            // 计算当前方向和目标方向之间的角度差
            const targetAngle = Math.atan2(
                this.homingTarget.y - this.y,
                this.homingTarget.x - this.x
            );
            
            // 逐渐调整方向
            let angleDiff = targetAngle - this.angle;
            
            // 确保角度差在 -PI 到 PI 之间
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // 平滑转向
            this.angle += angleDiff * this.homingStrength;
        }
        
        // 移动
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        // 更新已移动距离
        this.distance += this.speed;
        
        // 检查是否超出范围
        if (this.distance >= this.range) {
            this.active = false;
        }
    }
    
    draw(ctx, offsetX, offsetY) {
        ctx.save();
        
        // 移动到投射物位置
        ctx.translate(this.x - offsetX, this.y - offsetY);
        
        // 应用旋转
        if (this.rotateSpeed || this.shape !== 'rect') {
            ctx.rotate(this.rotation || this.angle);
        }
        
        ctx.fillStyle = this.color;
        
        // 根据形状绘制
        switch (this.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'sword':
                // 剑形状
                ctx.beginPath();
                ctx.moveTo(this.width / 2, 0);
                ctx.lineTo(0, -this.height / 2);
                ctx.lineTo(-this.width / 2, 0);
                ctx.lineTo(0, this.height / 2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'axe':
                // 斧头形状
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 3, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(0, -this.width / 2);
                ctx.lineTo(this.width / 2, 0);
                ctx.lineTo(0, this.width / 2);
                ctx.lineTo(-this.width / 2, 0);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'rune':
                // 符文形状（复杂图案）
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-this.width / 3, -this.width / 3);
                ctx.lineTo(this.width / 3, this.width / 3);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(this.width / 3, -this.width / 3);
                ctx.lineTo(-this.width / 3, this.width / 3);
                ctx.stroke();
                break;
                
            case 'star':
                // 星形
                ctx.beginPath();
                const spikes = 5;
                const outerRadius = this.width / 2;
                const innerRadius = this.width / 4;
                
                for (let i = 0; i < spikes * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (Math.PI / spikes) * i;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                
                ctx.closePath();
                ctx.fill();
                break;
                
            default: // rect
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                break;
        }
        
        ctx.restore();
    }
    
    checkCollision(target) {
        // 简单的圆形碰撞检测
        return Utils.checkCollision(this, target);
    }
    
    hit(target) {
        // 造成伤害
        target.takeDamage(this.damage);
        
        // 应用击退
        if (this.knockback > 0 && target.applyKnockback) {
            target.applyKnockback(this.knockback, this.angle);
        }
        
        // 调用自定义命中效果
        if (this.onHit) {
            this.onHit(target);
        }
        
        // 检查目标是否死亡
        if (target.health <= 0 && this.onKill) {
            this.onKill(target);
        }
    }
}

// 经验球类
class ExperienceOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = 5 + value / 2; // 经验值越高，球越大
        this.color = '#5ebaff';
        this.pulseSpeed = 0.05;
        this.pulseAmount = 0.2;
        this.pulseOffset = Math.random() * Math.PI * 2; // 随机初始相位
        this.attractionRange = 150; // 吸引范围
        this.maxSpeed = 5; // 最大移动速度
        this.speed = 0;
    }
    
    update(game) {
        // 计算与玩家的距离
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 如果玩家在吸引范围内，经验球会被吸引
        if (distance < this.attractionRange) {
            // 计算吸引力（距离越近吸引力越大）
            const attraction = 1 - (distance / this.attractionRange);
            this.speed = attraction * this.maxSpeed;
            
            // 移向玩家
            if (distance > 0) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        }
    }
    
    draw(ctx, offsetX, offsetY) {
        // 脉动效果
        const pulse = 1 + Math.sin(this.pulseOffset + Date.now() * this.pulseSpeed) * this.pulseAmount;
        const displayRadius = this.radius * pulse;
        
        // 绘制经验球
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x - offsetX, this.y - offsetY, displayRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制发光效果
        const gradient = ctx.createRadialGradient(
            this.x - offsetX, this.y - offsetY, displayRadius * 0.5,
            this.x - offsetX, this.y - offsetY, displayRadius * 1.5
        );
        gradient.addColorStop(0, 'rgba(94, 186, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(94, 186, 255, 0)');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(this.x - offsetX, this.y - offsetY, displayRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 粒子效果
class Particle {
    constructor(x, y, color, size, lifetime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.initialLifetime = lifetime;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.lifetime--;
    }
    
    draw(ctx, offsetX, offsetY) {
        const alpha = this.lifetime / this.initialLifetime;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// 视觉效果类
class Effect {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.color = options.color || '#fff';
        this.radius = options.radius || 20;
        this.duration = options.duration || 30;
        this.initialDuration = this.duration;
    }
    
    update() {
        this.duration--;
    }
    
    draw(ctx, offsetX, offsetY) {
        const ratio = this.duration / this.initialDuration;
        const currentRadius = this.radius * (2 - ratio);
        
        ctx.globalAlpha = ratio;
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// 盟友类（由欧西里斯之剑等武器召唤）
class Ally {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.health = options.health || 20;
        this.maxHealth = this.health;
        this.damage = options.damage || 5;
        this.radius = options.radius || 15;
        this.color = options.color || '#ffcc00';
        this.range = options.range || 150;
        this.attackCooldown = 0;
        this.maxAttackCooldown = 60;
        this.duration = options.duration || 600; // 10秒默认存在时间
        this.alive = true;
        this.targetEnemy = null;
    }
    
    update(game) {
        if (!this.alive) return;
        
        // 更新持续时间
        this.duration--;
        if (this.duration <= 0) {
            this.alive = false;
            return;
        }
        
        // 寻找最近的敌人
        let nearestDistance = Infinity;
        this.targetEnemy = null;
        
        for (const enemy of game.enemies) {
            const distance = Utils.distance(this.x, this.y, enemy.x, enemy.y);
            if (distance < nearestDistance && distance < this.range) {
                nearestDistance = distance;
                this.targetEnemy = enemy;
            }
        }
        
        // 如果找到敌人，则移向敌人并攻击
        if (this.targetEnemy) {
            // 移动到敌人
            const dx = this.targetEnemy.x - this.x;
            const dy = this.targetEnemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.radius + this.targetEnemy.radius) {
                const moveSpeed = 2;
                this.x += (dx / distance) * moveSpeed;
                this.y += (dy / distance) * moveSpeed;
            }
            
            // 攻击敌人
            if (this.attackCooldown <= 0) {
                if (Utils.checkCollision(this, this.targetEnemy)) {
                    this.attack(game);
                    this.attackCooldown = this.maxAttackCooldown;
                }
            } else {
                this.attackCooldown--;
            }
        } else {
            // 如果没有敌人，则移向玩家
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 80) { // 保持与玩家的距离
                const moveSpeed = 1.5;
                this.x += (dx / distance) * moveSpeed;
                this.y += (dy / distance) * moveSpeed;
            }
        }
    }
    
    attack(game) {
        if (this.targetEnemy && this.targetEnemy.alive) {
            this.targetEnemy.takeDamage(this.damage);
            
            // 创建攻击效果
            game.createEffect({
                x: this.targetEnemy.x,
                y: this.targetEnemy.y,
                color: '#ffaa00',
                radius: 10,
                duration: 15
            });
        }
    }
    
    draw(ctx, offsetX, offsetY) {
        if (!this.alive) return;
        
        // 绘制盟友
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 如果时间快到了，闪烁提醒
        if (this.duration < 120 && Math.floor(this.duration / 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(this.x - offsetX, this.y - offsetY, this.radius * 1.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // 绘制血条
        const healthPercentage = this.health / this.maxHealth;
        const healthBarWidth = this.radius * 2;
        const healthBarHeight = 3;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(
            this.x - offsetX - healthBarWidth / 2,
            this.y - offsetY - this.radius - 8,
            healthBarWidth,
            healthBarHeight
        );
        
        ctx.fillStyle = healthPercentage > 0.5 ? '#0f0' : healthPercentage > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(
            this.x - offsetX - healthBarWidth / 2,
            this.y - offsetY - this.radius - 8,
            healthBarWidth * healthPercentage,
            healthBarHeight
        );
    }
} 