class Player {
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
            this.facingDirection = 'up';
        }
        if (this.game.keys.down || this.game.keys.s) {
            dy += this.speed;
            this.facingDirection = 'down';
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
            const deltaX = this.game.mouseX - this.game.canvas.width / 2;
            const deltaY = this.game.mouseY - this.game.canvas.height / 2;
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (length > 0) {
                // 确定方向
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    this.facingDirection = deltaX > 0 ? 'right' : 'left';
                } else {
                    this.facingDirection = deltaY > 0 ? 'down' : 'up';
                }
                
                // 移动
                const normalizedX = deltaX / length;
                const normalizedY = deltaY / length;
                
                dx = normalizedX * this.speed;
                dy = normalizedY * this.speed;
            }
        }
        
        // 冲刺（按住Shift键）
        if ((this.game.keys.shift || this.game.keys[' ']) && this.dashCooldown <= 0) {
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
            radius: this.radius
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
                    radius: this.radius * 0.9
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
            radius: this.radius * 1.5
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
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.2);
        
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
                radius: this.radius * 1.2
            });
        }
    }

    addWeapon(WeaponClass) {
        // 检查是否已有此武器
        const existingWeapon = this.weapons.find(w => w instanceof WeaponClass);
        
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
        ctx.arc(this.game.canvas.width / 2, this.game.canvas.height / 2, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制面部方向指示
        const directionOffset = this.radius * 0.6;
        const eyeSize = this.radius * 0.2;
        
        ctx.fillStyle = "#ffffff";
        
        if (this.facingDirection === 'right') {
            ctx.beginPath();
            ctx.arc(this.game.canvas.width / 2 + directionOffset, this.game.canvas.height / 2, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.facingDirection === 'left') {
            ctx.beginPath();
            ctx.arc(this.game.canvas.width / 2 - directionOffset, this.game.canvas.height / 2, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.facingDirection === 'up') {
            ctx.beginPath();
            ctx.arc(this.game.canvas.width / 2, this.game.canvas.height / 2 - directionOffset, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.facingDirection === 'down') {
            ctx.beginPath();
            ctx.arc(this.game.canvas.width / 2, this.game.canvas.height / 2 + directionOffset, eyeSize, 0, Math.PI * 2);
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
            this.game.canvas.width / 2 - healthBarWidth / 2,
            this.game.canvas.height / 2 - this.radius - 15,
            healthBarWidth,
            healthBarHeight
        );
        
        ctx.fillStyle = healthPercentage > 0.5 ? '#0f0' : healthPercentage > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(
            this.game.canvas.width / 2 - healthBarWidth / 2,
            this.game.canvas.height / 2 - this.radius - 15,
            healthBarWidth * healthPercentage,
            healthBarHeight
        );
        
        // 绘制冲刺冷却指示器
        if (this.dashCooldown > 0) {
            const dashCooldownPercentage = this.dashCooldown / this.maxDashCooldown;
            const dashBarWidth = this.radius * 1.5;
            const dashBarHeight = 3;
            
            ctx.fillStyle = '#777';
            ctx.fillRect(
                this.game.canvas.width / 2 - dashBarWidth / 2,
                this.game.canvas.height / 2 - this.radius - 8,
                dashBarWidth,
                dashBarHeight
            );
            
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(
                this.game.canvas.width / 2 - dashBarWidth / 2,
                this.game.canvas.height / 2 - this.radius - 8,
                dashBarWidth * (1 - dashCooldownPercentage),
                dashBarHeight
            );
        }
    }

    drawUI(ctx) {
        // 绘制经验条
        const experienceBarWidth = this.game.canvas.width - 40;
        const experienceBarHeight = 10;
        const experiencePercentage = this.experience / this.experienceToNextLevel;
        
        ctx.fillStyle = '#444';
        ctx.fillRect(20, 20, experienceBarWidth, experienceBarHeight);
        
        ctx.fillStyle = '#4080ff';
        ctx.fillRect(20, 20, experienceBarWidth * experiencePercentage, experienceBarHeight);
        
        // 绘制等级
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.fillText(`Lv ${this.level}`, 20, 50);
        
        // 绘制健康状态
        ctx.fillText(`HP: ${Math.ceil(this.health)}/${this.maxHealth}`, 100, 50);
        
        // 绘制武器信息
        ctx.font = '14px Arial';
        let weaponY = 80;
        
        for (const weapon of this.weapons) {
            ctx.fillText(`${weapon.name} Lv${weapon.level}`, 20, weaponY);
            weaponY += 20;
        }
    }
} 