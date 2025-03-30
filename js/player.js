export class Player {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.radius = 20;
        this.speed = 3;
        this.color = '#5588ff';
        this.health = 100;
        this.maxHealth = 100;
        this.defense = 0;
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 10;
        this.weapons = [];
        this.facingDirection = 'right'; // 'right', 'left', 'up', 'down'
        this.isDashing = false;
        this.dashCooldown = 0;
        this.maxDashCooldown = 120; // 2秒冷却（60帧/秒）
        this.isPetrified = false;
        this.petrifyTimer = 0;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.maxInvulnerabilityTime = 60; // 1秒无敌时间
    }

    update() {
        // 处理无敌状态
        if (this.invulnerable) {
            this.invulnerabilityTimer--;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // 处理石化状态
        if (this.isPetrified) {
            this.petrifyTimer--;
            if (this.petrifyTimer <= 0) {
                this.isPetrified = false;
            }
            return; // 石化时不能移动或攻击
        }

        // 冲刺冷却
        if (this.dashCooldown > 0) {
            this.dashCooldown--;
        }

        if (this.isDashing) {
            return; // 冲刺中不响应其他控制
        }

        // 移动
        this.move();

        // 攻击
        this.attack();

        // 更新武器
        for (const weapon of this.weapons) {
            weapon.update(this.game);
        }
    }

    move() {
        let dx = 0;
        let dy = 0;

        // 键盘控制
        if (this.game.keys.up || this.game.keys.w) {
            dy -= this.speed;
            // 移除上下移动对facingDirection的影响
        }
        if (this.game.keys.down || this.game.keys.s) {
            dy += this.speed;
            // 移除上下移动对facingDirection的影响
        }
        if (this.game.keys.left || this.game.keys.a) {
            dx -= this.speed;
            this.facingDirection = 'left';
        }
        if (this.game.keys.right || this.game.keys.d) {
            dx += this.speed;
            this.facingDirection = 'right';
        }

        // 鼠标拖拽控制
        if (this.game.isDragging) {
            // 使用保存的鼠标初始位置作为锚点，而不是屏幕中心
            // 首先检查我们是否有保存的初始点击位置
            if (!this.game.dragStartX || !this.game.dragStartY) {
                // 如果没有保存的初始位置，则使用当前鼠标位置作为起始点
                this.game.dragStartX = this.game.mouseX;
                this.game.dragStartY = this.game.mouseY;
                this.game.dragStartPlayerX = this.x;
                this.game.dragStartPlayerY = this.y;
            }

            // 计算鼠标当前位置与开始位置的差值
            const deltaX = this.game.mouseX - this.game.dragStartX;
            const deltaY = this.game.mouseY - this.game.dragStartY;

            // 根据拖动方向确定玩家面向，但只考虑左右方向
            if (Math.abs(deltaX) > 5) {
                // 只有水平拖动才改变方向
                this.facingDirection = deltaX > 0 ? 'right' : 'left';
            }

            // 计算拖动方向和力度
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (length > 0) {
                // 标准化方向矢量
                const normalizedX = deltaX / length;
                const normalizedY = deltaY / length;

                // 根据拖动距离调整速度(有一个最大值限制)
                const speedMultiplier = Math.min(length / 50, 1.5); // 拖动50像素达到最大速度

                // 应用移动
                dx = normalizedX * this.speed * speedMultiplier;
                dy = normalizedY * this.speed * speedMultiplier;
            }
        } else {
            // 如果不再拖动，清除保存的起始位置
            this.game.dragStartX = null;
            this.game.dragStartY = null;
            this.game.dragStartPlayerX = null;
            this.game.dragStartPlayerY = null;
        }

        // 冲刺（按住Shift键）
        if (
            (this.game.keys.shift || this.game.keys[' ']) &&
            this.dashCooldown <= 0
        ) {
            this.dash(this.x + dx * 15, this.y + dy * 15);
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
        this.invulnerabilityTimer = 30; // 0.5秒无敌时间

        // 创建冲刺效果
        this.game.createEffect({
            x: this.x,
            y: this.y,
            color: '#80c0ff',
            duration: 20,
            radius: this.radius,
        });

        // 快速移动到目标位置
        const steps = 10;
        const dx = (targetX - this.x) / steps;
        const dy = (targetY - this.y) / steps;

        for (let i = 1; i <= steps; i++) {
            setTimeout(() => {
                // 在每一步创建残影效果
                this.game.createEffect({
                    x: this.x,
                    y: this.y,
                    color: '#a0d0ff',
                    duration: 15,
                    radius: this.radius * 0.9,
                });

                this.x += dx;
                this.y += dy;

                if (i === steps) {
                    this.isDashing = false;
                    this.dashCooldown = this.maxDashCooldown;
                }
            }, i * 20); // 每步20毫秒，总共200毫秒完成冲刺
        }
    }

    attack() {
        // 使用当前装备的所有武器攻击
        for (const weapon of this.weapons) {
            if (weapon.canAttack()) {
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
            duration: 20,
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
        this.experienceToNextLevel = Math.floor(
            this.experienceToNextLevel * 1.2
        );

        // 升级时回满血
        this.health = this.maxHealth;

        // 显示武器选择界面
        this.game.showWeaponSelection();
    }

    petrify(duration) {
        if (!this.invulnerable) {
            this.isPetrified = true;
            this.petrifyTimer = duration;

            // 创建石化效果
            this.game.createEffect({
                x: this.x,
                y: this.y,
                color: '#a0a0a0',
                duration: duration,
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
            // 无敌状态闪烁效果
            if (Math.floor(this.invulnerabilityTimer / 5) % 2 === 0) {
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
}
