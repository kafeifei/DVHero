import { Utils } from './utils.js';

// 敌人基类
class Enemy {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.health = options.health || 10;
        this.maxHealth = options.health || 10;
        this.damage = options.damage || 1;
        this.speed = options.speed * 60 || 60; // 转换为像素/秒
        this.radius = options.radius || 15;
        this.color = options.color || '#f00';
        this.level = options.level || 1;
        this.expValue = options.expValue || 1;
        this.type = options.type || 'normal'; // normal, dark, etc.
        this.target = options.target || null;
        this.knockbackResistance = options.knockbackResistance || 1;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.alive = true;
        this.id = Enemy.nextId++;
    }

    update(game, deltaTime) {
        // 如果没有提供deltaTime，使用默认值（1/60秒 = 约16.7ms）
        deltaTime = deltaTime || 1/60;
        
        if (!this.alive) return;

        // 处理击退效果
        if (this.knockbackX !== 0 || this.knockbackY !== 0) {
            this.x += this.knockbackX;
            this.y += this.knockbackY;
            this.knockbackX *= Math.pow(0.8, 60 * deltaTime); // 调整为与时间相关的衰减
            this.knockbackY *= Math.pow(0.8, 60 * deltaTime);

            if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
            if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;

            return; // 被击退时不移动
        }

        // 向目标移动
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const moveX = (dx / distance) * this.speed * deltaTime; // 基于时间的移动
                const moveY = (dy / distance) * this.speed * deltaTime;
                this.x += moveX;
                this.y += moveY;
            }

            // 检查与玩家的碰撞
            if (Utils.checkCollision(this, this.target)) {
                this.onHit(this.target);
            }
        }
    }

    draw(ctx, offsetX, offsetY) {
        if (!this.alive) return;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(
            this.x + offsetX,
            this.y + offsetY,
            this.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 绘制血条
        const healthPercentage = this.health / this.maxHealth;
        const healthBarWidth = this.radius * 2;
        const healthBarHeight = 4;

        ctx.fillStyle = '#333';
        ctx.fillRect(
            this.x + offsetX - healthBarWidth / 2,
            this.y + offsetY - this.radius - 10,
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
            this.x + offsetX - healthBarWidth / 2,
            this.y + offsetY - this.radius - 10,
            healthBarWidth * healthPercentage,
            healthBarHeight
        );
    }

    takeDamage(amount) {
        this.health -= amount;

        if (this.health <= 0 && this.alive) {
            this.die();
        }
    }

    die() {
        this.alive = false;
        this.dropExperience();
    }

    dropExperience() {
        if (this.target && this.target.game) {
            // 计算掉落概率，从50%开始，随等级增加
            const baseDropChance = 0.5;
            const enemyLevel = this.level || 1; // 如果level未定义，默认为1级
            const levelBonus = Math.min(0.5, (enemyLevel - 1) * 0.1); // 每级增加10%，最多增加到100%
            const dropChance = baseDropChance + levelBonus;

            // 根据概率决定是否掉落
            if (Math.random() < dropChance) {
                this.target.game.createExp(this.x, this.y, this.expValue);
            }
        }
    }

    onHit(target) {
        target.takeDamage(this.damage);
    }

    applyKnockback(force, angle) {
        const adjustedForce = force / this.knockbackResistance;
        this.knockbackX = Math.cos(angle) * adjustedForce;
        this.knockbackY = Math.sin(angle) * adjustedForce;
    }
}

// 添加静态计数器用于生成唯一ID
Enemy.nextId = 1;

// 僵尸
class Zombie extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 15,
            damage: 2,
            speed: 0.7,
            radius: 15,
            color: '#83a83b',
            expValue: 1,
            type: 'dark',
            knockbackResistance: 1,
        });
    }
}

// 骷髅士兵
class SkeletonSoldier extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 20,
            damage: 3,
            speed: 1,
            radius: 15,
            color: '#c8c8c8',
            expValue: 2,
            type: 'dark',
            knockbackResistance: 1.2,
        });
    }
}

// 斧头铠甲
class AxeArmor extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 35,
            damage: 5,
            speed: 0.8,
            radius: 20,
            color: '#db7d46',
            expValue: 4,
            type: 'normal',
            knockbackResistance: 2,
        });

        this.attackRange = 100;
        this.attackCooldown = 0;
        this.maxAttackCooldown = 2.0; // 已改为秒为单位
    }

    update(game, deltaTime) {
        super.update(game, deltaTime);

        if (!this.alive) return;

        // 远程攻击 - 基于时间的冷却
        if (this.attackCooldown <= 0) {
            const distanceToTarget = Utils.distance(
                this.x,
                this.y,
                this.target.x,
                this.target.y
            );

            if (distanceToTarget < this.attackRange) {
                this.attack(game);
                this.attackCooldown = this.maxAttackCooldown;
            }
        } else {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown < 0) this.attackCooldown = 0;
        }
    }

    attack(game) {
        if (!this.target) return;

        const angle = Math.atan2(
            this.target.y - this.y,
            this.target.x - this.x
        );

        game.createEnemyProjectile({
            x: this.x,
            y: this.y,
            angle: angle,
            speed: 3 * 60, // 转换为像素/秒
            damage: this.damage,
            range: this.attackRange,
            color: '#ff7700',
            width: 20,
            height: 20,
            shape: 'axe',
            rotateSpeed: 0.2 * Math.PI * 2, // 转换为弧度/秒
        });
    }
}

// 飞天美杜莎头
class MedusaHead extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 15,
            damage: 4,
            speed: 1.5,
            radius: 12,
            color: '#b0ff40',
            expValue: 3,
            type: 'dark',
            knockbackResistance: 0.5,
        });

        this.waveAmplitude = 50; // 波动幅度
        this.waveFrequency = 0.5; // 波动频率（Hz）- 从3降低到0.5，更合理的值
        this.waveOffset = Math.random() * Math.PI * 2; // 随机波动起始点
        this.baseY = this.y;
        this.movementTime = 0;
    }

    update(game, deltaTime) {
        deltaTime = deltaTime || 1/60;
        
        if (!this.alive) return;

        this.movementTime += deltaTime; // 以秒为单位累积时间

        // 处理击退效果
        if (this.knockbackX !== 0 || this.knockbackY !== 0) {
            this.x += this.knockbackX;
            this.y += this.knockbackY;
            this.knockbackX *= Math.pow(0.8, 60 * deltaTime);
            this.knockbackY *= Math.pow(0.8, 60 * deltaTime);

            if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
            if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;

            return;
        }

        // 波浪式移动
        if (this.target) {
            const dx = this.target.x - this.x;
            const distance = Math.abs(dx);

            if (distance > 0) {
                const moveX = Math.sign(dx) * this.speed * deltaTime;
                this.x += moveX;

                // 波浪运动（上下波动）
                // 使用累积的实际时间，而不是依赖帧率
                this.y =
                    this.baseY +
                    Math.sin(
                        this.movementTime * this.waveFrequency * Math.PI * 2 + this.waveOffset
                    ) * this.waveAmplitude;
            }

            // 检查与玩家的碰撞
            if (Utils.checkCollision(this, this.target)) {
                this.onHit(this.target);
            }
        }
    }
}

// 剑之王
class BladeSoldier extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 45,
            damage: 6,
            speed: 1.2,
            radius: 18,
            color: '#5273b8',
            expValue: 5,
            type: 'normal',
            knockbackResistance: 1.5,
        });

        this.attackCooldown = 0;
        this.maxAttackCooldown = 1.5; // 1.5秒冷却（改为秒为单位）
    }

    update(game, deltaTime) {
        super.update(game, deltaTime);

        if (!this.alive) return;

        // 攻击逻辑 - 基于时间的冷却
        if (this.attackCooldown <= 0) {
            const distanceToTarget = Utils.distance(
                this.x,
                this.y,
                this.target.x,
                this.target.y
            );

            if (distanceToTarget < 60) {
                // 攻击范围
                this.attack(game);
                this.attackCooldown = this.maxAttackCooldown;
            }
        } else {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown < 0) this.attackCooldown = 0;
        }
    }

    attack(game) {
        if (!this.target) return;

        const angle = Math.atan2(
            this.target.y - this.y,
            this.target.x - this.x
        );

        // 剑气攻击
        for (let i = -1; i <= 1; i++) {
            const spreadAngle = angle + (i * Math.PI) / 8;

            game.createEnemyProjectile({
                x: this.x,
                y: this.y,
                angle: spreadAngle,
                speed: 5 * 60, // 转换为像素/秒
                damage: this.damage,
                range: 80,
                color: '#80a0ff',
                width: 40,
                height: 5,
                duration: 0.33, // 从20帧改为0.33秒
            });
        }
    }
}

// 骷髅枪兵
class SpearGuard extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 40,
            damage: 7,
            speed: 0.9,
            radius: 17,
            color: '#d8d8a0',
            expValue: 6,
            type: 'dark',
            knockbackResistance: 1.8,
        });

        this.attackRange = 120;
        this.attackCooldown = 0;
        this.maxAttackCooldown = 2.5; // 从150帧改为2.5秒
    }

    update(game, deltaTime) {
        deltaTime = deltaTime || 1/60;
        
        super.update(game, deltaTime);

        if (!this.alive) return;

        // 长矛攻击
        if (this.attackCooldown <= 0) {
            const distanceToTarget = Utils.distance(
                this.x,
                this.y,
                this.target.x,
                this.target.y
            );

            if (distanceToTarget < this.attackRange) {
                this.attack(game);
                this.attackCooldown = this.maxAttackCooldown;
            }
        } else {
            this.attackCooldown -= 60 * deltaTime; // 基于时间减少冷却
        }
    }

    attack(game) {
        if (!this.target) return;

        const angle = Math.atan2(
            this.target.y - this.y,
            this.target.x - this.x
        );

        game.createEnemyProjectile({
            x: this.x,
            y: this.y,
            angle: angle,
            speed: 6 * 60, // 转换为像素/秒
            damage: this.damage,
            range: this.attackRange,
            color: '#e8e8b0',
            width: 60,
            height: 8,
            duration: 0.5, // 从30帧改为0.5秒
            piercing: true,
        });
    }
}

// 火焰恶魔
class FireDemon extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 55,
            damage: 8,
            speed: 1.1,
            radius: 22,
            color: '#ff4000',
            expValue: 8,
            type: 'dark',
            knockbackResistance: 1.7,
        });

        this.attackRange = 180;
        this.attackCooldown = 0;
        this.maxAttackCooldown = 2.0; // 从120帧改为2.0秒
    }

    update(game, deltaTime) {
        deltaTime = deltaTime || 1/60;
        
        super.update(game, deltaTime);

        if (!this.alive) return;

        // 火球攻击
        if (this.attackCooldown <= 0) {
            const distanceToTarget = Utils.distance(
                this.x,
                this.y,
                this.target.x,
                this.target.y
            );

            if (distanceToTarget < this.attackRange) {
                this.attack(game);
                this.attackCooldown = this.maxAttackCooldown;
            }
        } else {
            this.attackCooldown -= 60 * deltaTime; // 基于时间减少冷却
        }
    }

    attack(game) {
        if (!this.target) return;

        const angle = Math.atan2(
            this.target.y - this.y,
            this.target.x - this.x
        );

        // 三个火球
        for (let i = -1; i <= 1; i++) {
            const spreadAngle = angle + (i * Math.PI) / 12;

            const delay = i * 200 + 200; // 间隔发射，毫秒单位
            setTimeout(
                () => {
                    // 检查敌人是否还活着
                    if (!this.alive || !game.isRunning || game.isPaused) return;
                    
                    game.createEnemyProjectile({
                        x: this.x,
                        y: this.y,
                        angle: spreadAngle,
                        speed: 4 * 60, // 转换为像素/秒
                        damage: this.damage,
                        range: this.attackRange,
                        color: '#ff7700',
                        width: 20,
                        height: 20,
                        shape: 'circle',
                        duration: 2.0, // 从120帧改为2.0秒
                    });
                },
                delay
            );
        }
    }
}

// 狮鹫兽（瓦尔哈拉骑士）
class ValhallaKnight extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 70,
            damage: 9,
            speed: 1.4,
            radius: 25,
            color: '#c0a060',
            expValue: 10,
            type: 'normal',
            knockbackResistance: 2.2,
        });

        this.dashCooldown = 0;
        this.maxDashCooldown = 3.0; // 从180帧改为3.0秒
        this.isDashing = false;
        this.dashSpeed = 5 * 60; // 转换为像素/秒
        this.dashDuration = 0;
        this.maxDashDuration = 0.33; // 从20帧改为0.33秒
        this.dashTargetX = 0;
        this.dashTargetY = 0;
    }

    update(game, deltaTime) {
        deltaTime = deltaTime || 1/60;
        
        if (!this.alive) return;

        // 处理击退效果
        if (this.knockbackX !== 0 || this.knockbackY !== 0) {
            this.x += this.knockbackX;
            this.y += this.knockbackY;
            this.knockbackX *= Math.pow(0.8, 60 * deltaTime);
            this.knockbackY *= Math.pow(0.8, 60 * deltaTime);

            if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
            if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;

            return;
        }

        // 冲刺攻击
        if (this.isDashing) {
            this.dashDuration -= 60 * deltaTime; // 基于时间减少持续时间

            const dx = this.dashTargetX - this.x;
            const dy = this.dashTargetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const moveX = (dx / distance) * this.dashSpeed * (60 * deltaTime);
                const moveY = (dy / distance) * this.dashSpeed * (60 * deltaTime);
                this.x += moveX;
                this.y += moveY;
            }

            // 检查与玩家的碰撞
            if (Utils.checkCollision(this, this.target)) {
                this.onHit(this.target);
            }

            if (this.dashDuration <= 0) {
                this.isDashing = false;
            }

            return;
        }

        // 普通移动逻辑
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const moveX = (dx / distance) * this.speed * deltaTime;
                const moveY = (dy / distance) * this.speed * deltaTime;
                this.x += moveX;
                this.y += moveY;
            }

            // 检查与玩家的碰撞
            if (Utils.checkCollision(this, this.target)) {
                this.onHit(this.target);
            }

            // 冲刺逻辑
            if (this.dashCooldown <= 0 && distance < 200 && distance > 50) {
                this.startDash();
                this.dashCooldown = this.maxDashCooldown;
            } else {
                this.dashCooldown -= 60 * deltaTime; // 基于时间减少冷却
            }
        }
    }

    startDash() {
        this.isDashing = true;
        this.dashDuration = this.maxDashDuration;
        this.dashTargetX = this.target.x;
        this.dashTargetY = this.target.y;
    }

    onHit(target) {
        // 冲刺时造成更多伤害
        const damage = this.isDashing ? this.damage * 1.5 : this.damage;
        target.takeDamage(damage);
    }
}

// 金色美杜莎
class Gorgon extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 80,
            damage: 10,
            speed: 1.2,
            radius: 20,
            color: '#ffd700',
            expValue: 12,
            type: 'dark',
            knockbackResistance: 1.8,
        });

        this.petrifyRange = 150;
        this.petrifyChance = 0.3; // 石化几率
        this.petrifyDuration = 3.0; // 从180帧改为3.0秒
        this.attackCooldown = 0;
        this.maxAttackCooldown = 4.0; // 从240帧改为4.0秒
    }

    update(game, deltaTime) {
        deltaTime = deltaTime || 1/60;
        
        super.update(game, deltaTime);

        if (!this.alive) return;

        // 石化攻击
        if (this.attackCooldown <= 0) {
            const distanceToTarget = Utils.distance(
                this.x,
                this.y,
                this.target.x,
                this.target.y
            );

            if (distanceToTarget < this.petrifyRange) {
                this.attack(game);
                this.attackCooldown = this.maxAttackCooldown;
            }
        } else {
            this.attackCooldown -= 60 * deltaTime; // 基于时间减少冷却
        }
    }

    attack(game) {
        if (!this.target) return;

        // 石化眼光
        const petrifyRay = {
            x: this.x,
            y: this.y,
            angle: Math.atan2(this.target.y - this.y, this.target.x - this.x),
            speed: 0,
            damage: this.damage,
            range: this.petrifyRange,
            color: '#ffff00',
            width: 20,
            height: 20,
            duration: 1.0, // 从60帧改为1.0秒
            onHit: (target) => {
                // 尝试石化目标
                if (Math.random() < this.petrifyChance) {
                    target.petrify(this.petrifyDuration);
                }
            },
        };

        game.createEnemyProjectile(petrifyRay);
    }
}

// 终极守卫
class Guardian extends Enemy {
    constructor(options) {
        super({
            ...options,
            health: 200,
            damage: 15,
            speed: 1.5,
            radius: 30,
            color: '#8000ff',
            expValue: 20,
            type: 'dark',
            knockbackResistance: 3,
        });

        this.attackPhase = 0; // 攻击阶段
        this.attackCooldown = 0;
        this.maxAttackCooldown = 2.0; // 从120帧改为2.0秒
        this.specialCooldown = 0;
        this.maxSpecialCooldown = 10.0; // 从600帧改为10.0秒
    }

    update(game, deltaTime) {
        deltaTime = deltaTime || 1/60;
        
        super.update(game, deltaTime);

        if (!this.alive) return;

        // 普通攻击
        if (this.attackCooldown <= 0) {
            this.attack(game);
            this.attackCooldown = this.maxAttackCooldown;
        } else {
            this.attackCooldown -= 60 * deltaTime; // 基于时间减少冷却
        }

        // 特殊攻击
        if (this.specialCooldown <= 0) {
            this.specialAttack(game);
            this.specialCooldown = this.maxSpecialCooldown;
        } else {
            this.specialCooldown -= 60 * deltaTime; // 基于时间减少冷却
        }
    }

    attack(game) {
        if (!this.target) return;

        const angle = Math.atan2(
            this.target.y - this.y,
            this.target.x - this.x
        );

        // 根据不同的阶段使用不同的攻击
        this.attackPhase = (this.attackPhase + 1) % 3;

        switch (this.attackPhase) {
            case 0: // 能量波
                for (let i = -2; i <= 2; i++) {
                    const spreadAngle = angle + (i * Math.PI) / 10;

                    game.createEnemyProjectile({
                        x: this.x,
                        y: this.y,
                        angle: spreadAngle,
                        speed: 4 * 60, // 转换为像素/秒
                        damage: this.damage,
                        range: 200,
                        color: '#c080ff',
                        width: 30,
                        height: 10,
                        duration: 1.5, // 从90帧改为1.5秒
                    });
                }
                break;

            case 1: // 能量球
                game.createEnemyProjectile({
                    x: this.x,
                    y: this.y,
                    angle: angle,
                    speed: 3 * 60, // 转换为像素/秒
                    damage: this.damage * 1.5,
                    range: 250,
                    color: '#ff00ff',
                    width: 25,
                    height: 25,
                    shape: 'circle',
                    duration: 2.5, // 从150帧改为2.5秒
                    piercing: true,
                });
                break;

            case 2: // 追踪弹
            {
                const numProjectiles = 3;
                for (let i = 0; i < numProjectiles; i++) {
                    setTimeout(() => {
                        if (this.alive && this.target) {
                            const currentAngle = Math.atan2(
                                this.target.y - this.y,
                                this.target.x - this.x
                            );

                            game.createEnemyProjectile({
                                x: this.x,
                                y: this.y,
                                angle: currentAngle,
                                speed: (2 + i * 0.5) * 60, // 转换为像素/秒
                                damage: this.damage,
                                range: 300,
                                color: '#4000ff',
                                width: 15,
                                height: 15,
                                shape: 'star',
                                duration: 3.0, // 从180帧改为3.0秒
                                homing: true,
                                homingTarget: this.target,
                                homingStrength: 0.03,
                            });
                        }
                    }, i * 300);
                }
                break;
            }
        }
    }

    specialAttack(game) {
        if (!this.target) return;

        // 毁灭光线 - 大范围强力攻击
        game.showWarning('终极守卫正在准备毁灭光线！', 3000);

        setTimeout(() => {
            if (!this.alive) return;

            const angle = Math.atan2(
                this.target.y - this.y,
                this.target.x - this.x
            );

            // 创建大型光线攻击
            game.createEnemyProjectile({
                x: this.x,
                y: this.y,
                angle: angle,
                speed: 2 * 60, // 转换为像素/秒
                damage: this.damage * 3,
                range: 400,
                color: '#ff00ff',
                width: 80,
                height: 30,
                duration: 2.0, // 从120帧改为2.0秒
                piercing: true,
                onUpdate: (proj, deltaTime) => {
                    // 创建粒子效果 - 改为基于时间的频率
                    if (Math.random() < 0.2 * (60 * deltaTime)) { // 大约每5帧一次，现在是每0.08秒约20%的概率
                        game.createParticle(
                            proj.x + (Math.random() * 60 - 30),
                            proj.y + (Math.random() * 20 - 10),
                            '#ff80ff',
                            10,
                            0.5 // 从30帧改为0.5秒
                        );
                    }
                },
            });
        }, 2000); // 2秒预警时间（毫秒）
    }
}

// 敌人库
export const EnemyLibrary = {
    Zombie,
    SkeletonSoldier,
    AxeArmor,
    MedusaHead,
    BladeSoldier,
    SpearGuard,
    FireDemon,
    ValhallaKnight,
    Gorgon,
    Guardian,
};
