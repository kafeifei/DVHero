export class Player {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        
        console.log('Player构造函数被调用');
        
        this.radius = 20;
        this.color = '#5588ff';
        this.speed = 180; // 速度单位改为像素/秒 (原来是3像素/帧)
        this.health = 100;
        this.maxHealth = 100;
        this.defense = 0;
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 10;
        this.weapons = []; // 武器数组
        
        this.facingDirection = 'right'; // 'right', 'left', 'up', 'down'
        this.isDashing = false;
        this.dashCooldown = 0;
        this.maxDashCooldown = 2.0; // 2秒冷却（改为以秒为单位）
        this.isPetrified = false;
        this.petrifyTimer = 0;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.maxInvulnerabilityTime = 1.0; // 1秒无敌时间（改为以秒为单位）
    }

    update(deltaTime) {
        // 如果没有提供deltaTime，使用默认值（1/60秒 = 约16.7ms）
        deltaTime = deltaTime || 1/60;
        
        // 处理无敌状态
        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // 处理石化状态
        if (this.isPetrified) {
            this.petrifyTimer -= deltaTime;
            if (this.petrifyTimer <= 0) {
                this.isPetrified = false;
            }
            return; // 石化时不能移动或攻击
        }

        // 冲刺冷却 - 基于时间更新
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
            if (this.dashCooldown < 0) this.dashCooldown = 0;
        }

        if (this.isDashing) {
            return; // 冲刺中不响应其他控制
        }

        // 移动 - 传递deltaTime
        this.move(deltaTime);

        // 攻击
        this.attack();

        // 更新武器
        for (const weapon of this.weapons) {
            weapon.update(this.game, deltaTime);
        }
    }

    move(deltaTime) {
        // 如果没有提供deltaTime，使用默认值（1/60秒 = 约16.7ms）
        deltaTime = deltaTime || 1/60;
        
        let dx = 0;
        let dy = 0;
        let directionChanged = false;
        let oldDirection = this.facingDirection;

        // 键盘控制
        if (this.game.keys.up || this.game.keys.w || this.game.keys.ArrowUp || this.game.keys.W) {
            dy -= this.speed * deltaTime;
            this.facingDirection = 'up';
            directionChanged = true;
        }
        if (this.game.keys.down || this.game.keys.s || this.game.keys.ArrowDown || this.game.keys.S) {
            dy += this.speed * deltaTime;
            this.facingDirection = 'down';
            directionChanged = true;
        }
        if (this.game.keys.left || this.game.keys.a || this.game.keys.ArrowLeft || this.game.keys.A) {
            dx -= this.speed * deltaTime;
            this.facingDirection = 'left';
            directionChanged = true;
        }
        if (this.game.keys.right || this.game.keys.d || this.game.keys.ArrowRight || this.game.keys.D) {
            dx += this.speed * deltaTime;
            this.facingDirection = 'right';
            directionChanged = true;
        }

        // 鼠标控制（按下后根据移动方向操控角色）
        if (this.game.isDragging) {
            // 只有当有有效的起始点时才处理
            if (this.game.dragStartX !== null && this.game.dragStartY !== null) {
                // 计算鼠标与起始点的差值
                const deltaX = this.game.mouseX - this.game.dragStartX;
                const deltaY = this.game.mouseY - this.game.dragStartY;
                
                // 设定一个阈值，只有超过这个阈值才算有效移动
                const threshold = 5;
                const moveSpeed = this.speed * 1.2 * deltaTime; // 鼠标控制稍微快一点，并乘以deltaTime
                
                if (this.game.inputType === 'mouse') {
                    // 鼠标模式：以角色为锚点
                    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
                        // 计算相对于角色的移动方向
                        const angle = Math.atan2(deltaY, deltaX);
                        dx = Math.cos(angle) * moveSpeed;
                        dy = Math.sin(angle) * moveSpeed;
                        
                        // 更新朝向 - 根据移动角度设置四个方向
                        const angleDeg = angle * 180 / Math.PI;
                        if (angleDeg > -45 && angleDeg < 45) {
                            this.facingDirection = 'right';
                        } else if (angleDeg >= 45 && angleDeg < 135) {
                            this.facingDirection = 'down';
                        } else if (angleDeg >= -135 && angleDeg <= -45) {
                            this.facingDirection = 'up';
                        } else {
                            this.facingDirection = 'left';
                        }
                        directionChanged = true;
                    }
                } else if (this.game.inputType === 'touch') {
                    // 触摸模式：以触摸点为锚点
                    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
                        // 水平方向和垂直方向的判断
                        const absX = Math.abs(deltaX);
                        const absY = Math.abs(deltaY);
                        
                        // 确定主要移动方向（水平或垂直）
                        if (absX > absY) {
                            // 水平方向控制优先
                            if (deltaX > threshold) {
                                dx = moveSpeed; // 向右移动
                                this.facingDirection = 'right';
                            } else if (deltaX < -threshold) {
                                dx = -moveSpeed; // 向左移动
                                this.facingDirection = 'left';
                            }
                        } else {
                            // 垂直方向控制优先
                            if (deltaY > threshold) {
                                dy = moveSpeed; // 向下移动
                                this.facingDirection = 'down';
                            } else if (deltaY < -threshold) {
                                dy = -moveSpeed; // 向上移动
                                this.facingDirection = 'up';
                            }
                        }
                        directionChanged = true;
                    }
                }
            }
        }

        // 如果方向改变了，立即更新所有武器的攻击方向
        if (directionChanged) {
            // 当前面向左/右方向，记录这个水平方向
            if (this.facingDirection === 'left' || this.facingDirection === 'right') {
                const horizontalAngle = this.facingDirection === 'left' ? Math.PI : 0;
                for (const weapon of this.weapons) {
                    weapon.lastHorizontalAngle = horizontalAngle;
                }
            }
            // 如果之前是左/右，现在变成上/下，保持上一次的水平方向
            else if ((this.facingDirection === 'up' || this.facingDirection === 'down') && 
                     (oldDirection === 'left' || oldDirection === 'right')) {
                // 已经在上面设置过了，这里不需要重复设置
            }
        }

        // 冲刺（按住Shift键或空格键）
        if ((this.game.keys.shift || this.game.keys.Shift || this.game.keys[' ']) && this.dashCooldown <= 0 && (dx !== 0 || dy !== 0)) {
            // 计算冲刺距离 - 现在基于速度和一个固定系数
            const dashDistanceFactor = 15 * (1/60) / deltaTime; // 保持原来的冲刺距离感觉
            this.dash(this.x + dx * dashDistanceFactor, this.y + dy * dashDistanceFactor);
            return;
        }

        // 应用移动
        this.x += dx;
        this.y += dy;

        // 确保玩家不会离开游戏区域太远
        const boundary = 1000; // 边界限制
        this.x = Math.max(-boundary, Math.min(boundary, this.x));
        this.y = Math.max(-boundary, Math.min(boundary, this.y));
    }

    dash(targetX, targetY) {
        if (this.dashCooldown > 0) return;

        this.isDashing = true;
        this.invulnerable = true;
        this.invulnerabilityTimer = 0.5; // 0.5秒无敌时间（以秒为单位）

        // 创建冲刺效果
        this.game.createEffect({
            x: this.x,
            y: this.y,
            color: '#80c0ff',
            duration: 0.33, // 转为秒为单位
            radius: this.radius,
        });

        // 快速移动到目标位置
        const steps = 10;
        const dx = (targetX - this.x) / steps;
        const dy = (targetY - this.y) / steps;
        const dashDuration = 0.2; // 冲刺持续0.2秒
        const stepInterval = dashDuration / steps; // 每步间隔

        for (let i = 1; i <= steps; i++) {
            setTimeout(() => {
                // 在每一步创建残影效果
                this.game.createEffect({
                    x: this.x,
                    y: this.y,
                    color: '#a0d0ff',
                    duration: 0.25, // 转为秒为单位
                    radius: this.radius * 0.9,
                });

                this.x += dx;
                this.y += dy;

                if (i === steps) {
                    this.isDashing = false;
                    this.dashCooldown = this.maxDashCooldown;
                }
            }, i * stepInterval * 1000); // 将秒转换为毫秒
        }
    }

    attack() {
        // 检查是否有武器可以攻击
        for (let i = 0; i < this.weapons.length; i++) {
            const weapon = this.weapons[i];
            
            if (weapon.canAttack()) {
                // 只有第一把武器(索引为0)才触发攻击动画
                if (i === 0 && this.game.threeHelper) {
                    // 检查当前是否已经在播放攻击动画
                    const player = this.game.threeHelper.objects.get('player');
                    const isAlreadyAttacking = player && player.userData && player.userData.isAttacking;
                    
                    // 只有在当前没有攻击动画播放时才触发新的攻击动画
                    if (!isAlreadyAttacking) {
                        this.game.threeHelper.playAttackAnimation();
                    }
                }
                
                // 执行武器攻击
                weapon.attack(this.game, this);
            }
        }
    }

    takeDamage(amount) {
        if (this.invulnerable || this.isPetrified) return;

        // 应用防御力减伤
        const damageReduction = this.defense / (this.defense + 10); // 防御公式
        const reducedDamage = amount * (1 - damageReduction);

        this.health -= reducedDamage;

        // 受伤后短暂无敌
        this.invulnerable = true;
        this.invulnerabilityTimer = this.maxInvulnerabilityTime;

        // 创建受伤效果
        this.game.createEffect({
            x: this.x,
            y: this.y,
            color: '#ff0000',
            duration: 0.33, // 从20帧改为0.33秒
            radius: this.radius * 1.5,
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.game.gameOver();
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    gainExperience(amount) {
        this.experience += amount;

        while (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.experience -= this.experienceToNextLevel;
        
        // 经验需求增长更快，从1.2倍变为2.0倍
        this.experienceToNextLevel = Math.floor(
            this.experienceToNextLevel * 2.0
        );

        // 升级时只恢复1/4的血量
        const healAmount = this.maxHealth / 4;
        this.health = Math.min(this.maxHealth, this.health + healAmount);

        // 显示武器选择界面
        this.game.showWeaponSelection();
    }

    petrify(duration) {
        if (!this.invulnerable) {
            this.isPetrified = true;
            this.petrifyTimer = duration; // 现在以秒为单位

            // 创建石化效果
            this.game.createEffect({
                x: this.x,
                y: this.y,
                color: '#a0a0a0',
                duration: duration, // 现在以秒为单位
                radius: this.radius * 1.2,
            });
        }
    }

    addWeapon(WeaponClass) {
        // 检查是否已有此武器
        const existingWeapon = this.weapons.find(
            (w) => w instanceof WeaponClass
        );

        if (existingWeapon) {
            // 如果已有，则升级
            existingWeapon.levelUp();
        } else {
            // 否则添加新武器
            this.weapons.push(new WeaponClass());
        }
    }

    draw(ctx) {
        // 绘制玩家
        if (this.invulnerable) {
            // 无敌状态闪烁效果 - 不再基于帧数
            const flashFrequency = 10; // 闪烁频率 (Hz)
            const time = performance.now() / 1000; // 转换为秒
            if (Math.floor(time * flashFrequency) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }
        }

        ctx.fillStyle = this.isPetrified ? '#b0b0b0' : this.color;
        ctx.beginPath();
        ctx.arc(
            this.game.canvas2d.width / 2,
            this.game.canvas2d.height / 2,
            this.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 绘制面部方向指示
        const directionOffset = this.radius * 0.6;
        const eyeSize = this.radius * 0.2;

        ctx.fillStyle = '#ffffff';

        if (this.facingDirection === 'right') {
            ctx.beginPath();
            ctx.arc(
                this.game.canvas2d.width / 2 + directionOffset,
                this.game.canvas2d.height / 2,
                eyeSize,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else if (this.facingDirection === 'left') {
            ctx.beginPath();
            ctx.arc(
                this.game.canvas2d.width / 2 - directionOffset,
                this.game.canvas2d.height / 2,
                eyeSize,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else if (this.facingDirection === 'up') {
            ctx.beginPath();
            ctx.arc(
                this.game.canvas2d.width / 2,
                this.game.canvas2d.height / 2 - directionOffset,
                eyeSize,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else if (this.facingDirection === 'down') {
            ctx.beginPath();
            ctx.arc(
                this.game.canvas2d.width / 2,
                this.game.canvas2d.height / 2 + directionOffset,
                eyeSize,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // 重置透明度
        ctx.globalAlpha = 1;

        // 绘制血条
        const healthBarWidth = this.radius * 2;
        const healthBarHeight = 6;
        const healthPercentage = this.health / this.maxHealth;

        ctx.fillStyle = '#333';
        ctx.fillRect(
            this.game.canvas2d.width / 2 - healthBarWidth / 2,
            this.game.canvas2d.height / 2 - this.radius - 15,
            healthBarWidth,
            healthBarHeight
        );

        ctx.fillStyle =
            healthPercentage > 0.5
                ? '#0f0'
                : healthPercentage > 0.25
                  ? '#ff0'
                  : '#f00';
        ctx.fillRect(
            this.game.canvas2d.width / 2 - healthBarWidth / 2,
            this.game.canvas2d.height / 2 - this.radius - 15,
            healthBarWidth * healthPercentage,
            healthBarHeight
        );

        // 绘制冲刺冷却指示器
        if (this.dashCooldown > 0) {
            const dashCooldownPercentage =
                this.dashCooldown / this.maxDashCooldown;
            const dashBarWidth = this.radius * 1.5;
            const dashBarHeight = 3;

            // 获取当前画布尺寸
            const canvasWidth = this.game.is3D
                ? this.game.canvasUI.width
                : this.game.canvas2d.width;
            const canvasHeight = this.game.is3D
                ? this.game.canvasUI.height
                : this.game.canvas2d.height;

            ctx.fillStyle = '#777';
            ctx.fillRect(
                canvasWidth / 2 - dashBarWidth / 2,
                canvasHeight / 2 - this.radius - 8,
                dashBarWidth,
                dashBarHeight
            );

            ctx.fillStyle = '#00ffff';
            ctx.fillRect(
                canvasWidth / 2 - dashBarWidth / 2,
                canvasHeight / 2 - this.radius - 8,
                dashBarWidth * (1 - dashCooldownPercentage),
                dashBarHeight
            );
        }
    }

    drawUI(ctx) {
        if (!ctx) return;

        // 获取Canvas尺寸
        // const canvasWidth =
        //     this.game.canvasUI?.width || this.game.canvas2d.width;
        // const canvasHeight =
        //     this.game.canvasUI?.height || this.game.canvas2d.height;

        // 绘制血条
        // 血条背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 200, 20);

        // 当前血量
        const healthPercentage = this.health / this.maxHealth;
        ctx.fillStyle =
            healthPercentage > 0.5
                ? '#00ff00'
                : healthPercentage > 0.25
                  ? '#ffff00'
                  : '#ff0000';
        ctx.fillRect(10, 10, 200 * healthPercentage, 20);

        // 血条边框
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 200, 20);

        // 显示具体数值
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(`${Math.ceil(this.health)}/${this.maxHealth}`, 15, 25);

        // 绘制经验条
        // 经验条背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 35, 200, 10);

        // 当前经验
        const expPercentage = this.experience / this.experienceToNextLevel;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(10, 35, 200 * expPercentage, 10);

        // 经验条边框
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 35, 200, 10);

        // 显示等级
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(`等级 ${this.level}`, 15, 60);

        // 显示装备的武器
        let weaponY = 80;
        ctx.font = '14px Arial';
        ctx.fillText('武器:', 15, weaponY);

        for (const weapon of this.weapons) {
            weaponY += 20;
            ctx.fillText(`${weapon.name} Lv${weapon.level}`, 30, weaponY);
        }
    }

    // 判断玩家是否在移动
    isMoving() {
        // 检查键盘输入
        if (this.game.keys.up || this.game.keys.w || this.game.keys.ArrowUp || this.game.keys.W ||
            this.game.keys.down || this.game.keys.s || this.game.keys.ArrowDown || this.game.keys.S ||
            this.game.keys.left || this.game.keys.a || this.game.keys.ArrowLeft || this.game.keys.A ||
            this.game.keys.right || this.game.keys.d || this.game.keys.ArrowRight || this.game.keys.D) {
            return true;
        }
        
        // 检查鼠标/触摸拖动
        if (this.game.isDragging && this.game.dragStartX !== null && this.game.dragStartY !== null) {
            const deltaX = this.game.mouseX - this.game.dragStartX;
            const deltaY = this.game.mouseY - this.game.dragStartY;
            const threshold = 5;
            
            if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
                return true;
            }
        }
        
        // 检查冲刺状态
        if (this.isDashing) {
            return true;
        }
        
        return false;
    }
}
