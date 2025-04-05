// 武器基类
class Weapon {
    constructor(name, description, damage, level = 1) {
        this.name = name;
        this.description = description;
        this.baseDamage = damage;
        this.level = level;
        this.cooldown = 0;
        this.maxCooldown = 30; // 帧数
        this.lastHorizontalAngle = 0; // 记录最后的水平攻击角度
        this.lastUpdateTime = performance.now(); // 记录上次更新时间
        this.nextAttackTime = 0; // 下次可攻击的时间戳，初始为0表示可以立即攻击
    }

    getDamage() {
        return this.baseDamage * this.level;
    }

    levelUp() {
        this.level++;
        return this;
    }

    attack(game, player) {
        // 在子类中实现
    }

    update(game) {
        const currentTime = performance.now();
        
        // 只检查当前是否可以攻击，而不再使用累计的冷却减少
        if (currentTime >= this.nextAttackTime) {
            this.cooldown = 0;
        }
        
        this.lastUpdateTime = currentTime;
    }

    canAttack() {
        return performance.now() >= this.nextAttackTime;
    }

    resetCooldown() {
        const currentTime = performance.now();
        // 将冷却帧数转换为实际的毫秒数 (基于60FPS)
        const cooldownMs = (this.maxCooldown / 60) * 1000;
        // 设置下次可攻击的绝对时间戳
        this.nextAttackTime = currentTime + cooldownMs;
        this.cooldown = this.maxCooldown; // 保持此值用于兼容性
        this.lastUpdateTime = currentTime;
    }

    // 获取攻击角度，基于玩家当前朝向
    getAttackAngle(player) {
        // 将角色朝向转换为弧度
        switch (player.facingDirection) {
            case 'right': 
                this.lastHorizontalAngle = 0;
                return 0;        // 右
            case 'left':  
                this.lastHorizontalAngle = Math.PI;
                return Math.PI;    // 左
            case 'up':    
            case 'down':  
                // 上下方向时使用最后一次的水平方向
                return this.lastHorizontalAngle;
            default:      
                return 0;          // 默认右
        }
    }
}

// 真空刃
class Crissaegrim extends Weapon {
    constructor(level = 1) {
        super('真空刃', '快速左右攻击，可升级为同时攻击两侧', 5, level);
        this.maxCooldown = 60; // 降低为每秒一次攻击
        this.attacks = 4; // 连续攻击次数
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 获取攻击方向（只允许左右攻击）
        const direction = this.getAttackAngle(player);
        const range = 150;

        // 等级2以上同时攻击两侧
        const attackDirections = this.level >= 2 ? [0, Math.PI] : [direction];

        // 计算实际的攻击间隔时间，保持动画效果
        // 假设游戏设计为60帧为基准，原始间隔为50毫秒（即每3帧发射一次）
        // 我们需要确保动画效果在高帧率下也保持一致
        const targetFPS = 60;  // 目标帧率基准
        const originalDelay = 50; // 原始设计中的延迟（毫秒）
        // 获取当前游戏的帧率设置
        const currentFPS = game.fps || targetFPS;
        // 计算根据当前帧率调整后的延迟时间，确保动画速度保持一致
        const adjustedDelay = originalDelay * (targetFPS / currentFPS);

        for (const angle of attackDirections) {
            for (let i = 0; i < this.attacks; i++) {
                setTimeout(() => {
                    // 如果游戏已经停止，不继续创建投射物
                    if (!game.isRunning || game.isPaused) return;
                    
                    // 扇形攻击范围
                    const spreadAngle = Math.PI / 4; // 45度扇形

                    game.createProjectile({
                        x: player.x,
                        y: player.y,
                        angle:
                            angle +
                            (Math.random() * spreadAngle - spreadAngle / 2),
                        speed: 12,
                        damage: this.getDamage(),
                        range: range,
                        color: '#a0f0ff',
                        width: 30,
                        height: 3,
                        piercing: true,
                        shape: 'rect',  // 确保投射物使用矩形形状
                    });
                }, i * adjustedDelay); // 使用调整后的延迟时间
            }
        }

        this.resetCooldown();
    }
}

// 妖刀村正
class Muramasa extends Weapon {
    constructor(level = 1) {
        super('妖刀村正', '吸血强化，杀敌越多攻击越强，潜力无限提升', 6, level);
        this.maxCooldown = 25;
        this.killCount = 0;
        this.bonusDamage = 0;
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 使用getAttackAngle方法获取攻击角度
        const angle = this.getAttackAngle(player);

        game.createProjectile({
            x: player.x,
            y: player.y,
            angle: angle,
            speed: 8,
            damage: this.getDamage() + this.bonusDamage,
            range: 120,
            color: '#ff4040',
            width: 40,
            height: 4,
            piercing: false,
            onHit: (enemy) => {
                // 吸血效果
                player.heal(1);
            },
            onKill: (enemy) => {
                this.killCount++;
                if (this.killCount % 10 === 0) {
                    this.bonusDamage += 1;
                }
            },
        });

        this.resetCooldown();
    }

    getDamage() {
        return super.getDamage() + this.bonusDamage;
    }
}

// 盾之杖
class ShieldRod extends Weapon {
    constructor(level = 1) {
        super(
            '盾之杖',
            '搭配各种盾牌发动特殊技能，提供多样化战术效果',
            4,
            level
        );
        this.maxCooldown = 45;
        this.shields = [];
        this.currentShieldIndex = 0;
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 使用getAttackAngle方法获取攻击角度
        const angle = this.getAttackAngle(player);

        // 基础盾牌投射物
        game.createProjectile({
            x: player.x,
            y: player.y,
            angle: angle,
            speed: 9,
            damage: this.getDamage(),
            range: 120,
            color: '#40a0ff',
            width: 20,
            height: 20,
            shape: 'circle',
            piercing: false,
        });

        // 盾光环效果（视觉效果）
        game.createEffect({
            x: player.x,
            y: player.y,
            color: 'rgba(100, 180, 255, 0.5)',
            radius: 30,
            duration: 0.25,
        });

        this.resetCooldown();
    }

    update(game) {
        super.update(game);

        // 等级提升添加环绕盾牌
        const maxShields = Math.min(4, this.level);

        while (this.shields.length < maxShields) {
            this.addShield(game.player);
        }

        // 移除多余盾牌
        while (this.shields.length > maxShields) {
            this.shields.pop();
        }
    }

    addShield(player) {
        const shieldIndex = this.shields.length;
        const angle = ((Math.PI * 2) / 4) * shieldIndex;
        const distance = 50;

        this.shields.push({
            angle: angle,
            distance: distance,
        });
    }
}

// 阿鲁卡多之剑
class AluCardSword extends Weapon {
    constructor(level = 1) {
        super('阿鲁卡多之剑', '经典利刃，可聚集光芒发动强力剑气', 7, level);
        this.maxCooldown = 30;
        this.chargeLevel = 0;
        this.maxChargeLevel = 3;
        this.isCharging = false;
        this.chargeTimer = 0;
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 使用getAttackAngle方法获取攻击角度
        const angle = this.getAttackAngle(player);

        // 根据蓄力等级决定攻击方式
        if (this.chargeLevel >= this.maxChargeLevel) {
            // 满蓄力攻击
            game.createProjectile({
                x: player.x,
                y: player.y,
                angle: angle,
                speed: 12,
                damage: this.getDamage() * 2.5,
                range: 300,
                color: '#ffffff',
                width: 80,
                height: 8,
                shape: 'rect',
                piercing: true,
            });

            // 蓄力特效
            for (let i = 0; i < 20; i++) {
                // const particleAngle = // Unused variable
                //     angle + ((Math.random() * Math.PI) / 2 - Math.PI / 4);
                // const particleSpeed = 2 + Math.random() * 3; // Unused variable

                game.createParticle(
                    player.x,
                    player.y,
                    '#ffffff',
                    1 + Math.random() * 3,
                    0.5
                );
            }

            this.chargeLevel = 0;
        } else {
            // 普通攻击
            game.createProjectile({
                x: player.x,
                y: player.y,
                angle: angle,
                speed: 10,
                damage: this.getDamage(),
                range: 150,
                color: '#f0f0f0',
                width: 40,
                height: 4,
                shape: 'rect',
                piercing: false,
            });

            // 累积蓄力
            this.chargeLevel++;
        }

        this.resetCooldown();
    }

    update(game) {
        super.update(game);

        // 蓄力时特效
        if (this.chargeLevel > 0) {
            this.chargeTimer++;

            if (this.chargeTimer % 10 === 0) {
                const player = game.player;
                const particleColor = `hsl(${60 + this.chargeLevel * 60}, 100%, 70%)`;

                game.createParticle(
                    player.x + (Math.random() * 30 - 15),
                    player.y + (Math.random() * 30 - 15),
                    particleColor,
                    1 + Math.random() * 2,
                    0.33
                );
            }
        }
    }
}

// 天堂之剑
class HeavenSword extends Weapon {
    constructor(level = 1) {
        super(
            '天堂之剑',
            '投掷型飞剑攻击，双持后可进行十字交叉的范围攻击',
            8,
            level
        );
        this.maxCooldown = 35;
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 多方向十字飞剑
        const directions = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

        for (const angle of directions) {
            game.createProjectile({
                x: player.x,
                y: player.y,
                angle: angle,
                speed: 9,
                damage: this.getDamage(),
                range: 200,
                color: '#ffffa0',
                width: 15,
                height: 15,
                piercing: true,
                shape: 'sword',
            });
        }

        this.resetCooldown();
    }
}

// 圣剑
class HolySword extends Weapon {
    constructor(level = 1) {
        super(
            '圣剑',
            '对黑暗生物加倍伤害，有特殊指令释放强力圣属性攻击',
            9,
            level
        );
        this.maxCooldown = 30;
        this.specialAttackCooldown = 0;
        this.maxSpecialCooldown = 300; // 5秒
        this.nextSpecialAttackTime = 0; // 下次可用特殊攻击的时间戳
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 使用getAttackAngle方法获取攻击角度
        const angle = this.getAttackAngle(player);

        // 普通攻击
        game.createProjectile({
            x: player.x,
            y: player.y,
            angle: angle,
            speed: 8,
            damage: this.getDamage(),
            range: 140,
            color: '#ffff80',
            width: 40,
            height: 5,
            piercing: false,
            type: 'holy',
            onHit: (enemy) => {
                // 圣属性额外伤害
                if (enemy.type === 'dark') {
                    enemy.takeDamage(this.getDamage() * 0.5);
                }
            },
        });

        // 特殊攻击（当按Z键且特殊攻击不在冷却中）
        const currentTime = performance.now();
        if (game.keys.z && currentTime >= this.nextSpecialAttackTime) {
            // 圣光爆发
            for (let i = 0; i < 12; i++) {
                const specialAngle = (i / 12) * Math.PI * 2;
                game.createProjectile({
                    x: player.x,
                    y: player.y,
                    angle: specialAngle,
                    speed: 6,
                    damage: this.getDamage() * 1.5,
                    range: 250,
                    color: '#ffffcc',
                    width: 20,
                    height: 20,
                    piercing: true,
                    type: 'holy',
                    onHit: (enemy) => {
                        if (enemy.type === 'dark') {
                            enemy.takeDamage(this.getDamage());
                        }
                    },
                });
            }

            // 设置特殊攻击冷却
            const specialCooldownMs = (this.maxSpecialCooldown / 60) * 1000; // 转换为毫秒
            this.nextSpecialAttackTime = currentTime + specialCooldownMs;
            this.specialAttackCooldown = this.maxSpecialCooldown; // 保持兼容性
        }

        this.resetCooldown();
    }

    update(game) {
        super.update(game);

        // 检查特殊攻击是否可用
        const currentTime = performance.now();
        if (currentTime >= this.nextSpecialAttackTime) {
            this.specialAttackCooldown = 0;
        } else if (this.specialAttackCooldown > 0) {
            // 更新基于帧的冷却（用于UI显示）
            // 计算剩余冷却时间的百分比，并将其应用到基于帧的冷却值
            const remainingTime = this.nextSpecialAttackTime - currentTime;
            const specialCooldownMs = (this.maxSpecialCooldown / 60) * 1000;
            const percentage = remainingTime / specialCooldownMs;
            this.specialAttackCooldown = Math.ceil(this.maxSpecialCooldown * percentage);
        }
    }
}

// 符文剑
class RuneSword extends Weapon {
    constructor(level = 1) {
        super(
            '符文剑',
            '投掷出带符文效果的回旋剑刃，远距离高攻击力并可穿透墙壁',
            7,
            level
        );
        this.maxCooldown = 60; // 攻击频率
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 使用getAttackAngle方法获取攻击角度
        const angle = this.getAttackAngle(player);

        // 创建符文剑刃
        game.createProjectile({
            x: player.x,
            y: player.y,
            angle: angle,
            speed: 4,
            damage: this.getDamage(),
            range: 350,
            color: '#a040ff',
            width: 30,
            height: 20,
            piercing: true,
            shape: 'rune',
            rotateSpeed: 0.6,
            returning: true,
            returnAfter: 1.33, // 从80帧改为1.33秒
            returnTarget: player,
        });

        this.resetCooldown();
    }
}

// 巴吉尔之剑
class Badelaire extends Weapon {
    constructor(level = 1) {
        super(
            '巴吉尔之剑',
            '随游戏累计时长提升攻击力，适合长时间游戏逐步强化',
            6,
            level
        );
        this.maxCooldown = 25;
        this.timePlayed = 0; // 以秒为单位
        this.damageBonus = 0;
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 使用getAttackAngle方法获取攻击角度
        const angle = this.getAttackAngle(player);

        // 普通斩击
        game.createProjectile({
            x: player.x,
            y: player.y,
            angle: angle,
            speed: 9,
            damage: this.getDamage(),
            range: 150,
            color: '#c0c0c0',
            width: 45,
            height: 5,
            piercing: false,
        });

        this.resetCooldown();
    }

    update(game) {
        super.update(game);

        // 每60帧（约1秒）更新一次
        if (game.frameCount % 60 === 0) {
            this.timePlayed++;
            // 每分钟增加0.5点伤害
            if (this.timePlayed % 60 === 0) {
                this.damageBonus += 0.5;
            }
        }
    }

    getDamage() {
        return super.getDamage() + this.damageBonus;
    }
}

// 欧西里斯之剑（黎明之剑）
class SwordOfDawn extends Weapon {
    constructor(level = 1) {
        super(
            '欧西里斯之剑',
            '使用特殊指令召唤各类士兵协助战斗，趣味性与战术性兼具',
            8,
            level
        );
        this.maxCooldown = 50;
        this.summonCooldown = 0;
        this.maxSummonCooldown = 600; // 10秒冷却
        this.nextSummonTime = 0; // 下次可召唤士兵的时间戳
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 使用getAttackAngle方法获取攻击角度
        const angle = this.getAttackAngle(player);

        // 普通攻击
        game.createProjectile({
            x: player.x,
            y: player.y,
            angle: angle,
            speed: 8,
            damage: this.getDamage(),
            range: 140,
            color: '#ffb060',
            width: 40,
            height: 6,
            piercing: false,
        });

        // 召唤士兵（当按X键且召唤不在冷却中）
        const currentTime = performance.now();
        if (game.keys.x && currentTime >= this.nextSummonTime) {
            this.summonSoldiers(game, player);
            // 设置新的召唤冷却
            const summonCooldownMs = (this.maxSummonCooldown / 60) * 1000; // 转换为毫秒
            this.nextSummonTime = currentTime + summonCooldownMs;
            this.summonCooldown = this.maxSummonCooldown; // 保持兼容性
        }

        this.resetCooldown();
    }

    summonSoldiers(game, player) {
        const soldierCount = 2 + Math.floor(this.level / 2); // 等级越高召唤越多
        const duration = 10; // 从600帧改为10秒

        for (let i = 0; i < soldierCount; i++) {
            // 随机位置
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 30;
            const x = player.x + Math.cos(angle) * distance;
            const y = player.y + Math.sin(angle) * distance;

            game.createAlly({
                x: x,
                y: y,
                damage: this.getDamage() * 0.7,
                health: 20,
                range: 150,
                color: '#ffe0a0',
                radius: 15,
                duration: duration,
            });
        }
    }

    update(game) {
        super.update(game);

        // 检查召唤是否可用
        const currentTime = performance.now();
        if (currentTime >= this.nextSummonTime) {
            this.summonCooldown = 0;
        } else if (this.summonCooldown > 0) {
            // 更新基于帧的冷却（用于UI显示）
            // 计算剩余冷却时间的百分比，并将其应用到基于帧的冷却值
            const remainingTime = this.nextSummonTime - currentTime;
            const summonCooldownMs = (this.maxSummonCooldown / 60) * 1000;
            const percentage = remainingTime / summonCooldownMs;
            this.summonCooldown = Math.ceil(this.maxSummonCooldown * percentage);
        }
    }
}

// 玛沙之拳
class FistOfTulkas extends Weapon {
    constructor(level = 1) {
        super(
            '玛沙之拳',
            '近距离拳套武器，攻击迅速、可连续出拳并释放特殊格斗技能',
            6,
            level
        );
        this.maxCooldown = 15; // 非常快的攻击速度
        this.comboCount = 0;
        this.maxCombo = 5;
        this.comboTimer = 0;
        this.comboTimeout = 30; // 0.5秒内需要继续攻击才能保持连击
        this.comboExpireTime = 0; // combo过期的时间戳
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        // 使用getAttackAngle方法获取攻击角度
        const angle = this.getAttackAngle(player);

        const currentTime = performance.now();
        // 更新连击计数
        if (currentTime < this.comboExpireTime) {
            this.comboCount = (this.comboCount + 1) % (this.maxCombo + 1);
            if (this.comboCount === 0) this.comboCount = 1;
        } else {
            this.comboCount = 1;
        }

        // 设置新的combo计时器
        // 转换帧数为毫秒 (基于60FPS)
        const comboTimeoutMs = (this.comboTimeout / 60) * 1000;
        this.comboExpireTime = currentTime + comboTimeoutMs;
        this.comboTimer = this.comboTimeout; // 保持兼容性

        // 根据连击数调整伤害和攻击范围
        let damage = this.getDamage();
        let range = 80;
        let width = 30;
        let color = '#ffcc80';

        if (this.comboCount === 3) {
            // 第3击有击退效果
            damage *= 1.2;
            color = '#ff9040';
        } else if (this.comboCount === 5) {
            // 第5击（最后一击）威力更大
            damage *= 2;
            range = 100;
            width = 50;
            color = '#ff6000';
        }

        // 创建拳击效果
        game.createProjectile({
            x: player.x + Math.cos(angle) * 30,
            y: player.y + Math.sin(angle) * 30,
            angle: angle,
            speed: 12,
            damage: damage,
            range: range,
            color: color,
            width: width,
            height: width / 2,
            piercing: false,
            knockback: this.comboCount === 3 ? 30 : 10,
            duration: 0.17, // 从10帧改为0.17秒
        });

        this.resetCooldown();
    }

    update(game) {
        super.update(game);

        const currentTime = performance.now();
        if (this.comboTimer > 0) {
            // 检查combo是否过期
            if (currentTime >= this.comboExpireTime) {
                this.comboTimer = 0;
                this.comboCount = 0;
            } else {
                // 更新基于帧的计时器
                const remainingTime = this.comboExpireTime - currentTime;
                const comboTimeoutMs = (this.comboTimeout / 60) * 1000;
                const percentage = remainingTime / comboTimeoutMs;
                this.comboTimer = Math.ceil(this.comboTimeout * percentage);
            }
        }
    }
}

// 武器库
export const WeaponsLibrary = [
    Crissaegrim,
    Muramasa,
    ShieldRod,
    AluCardSword,
    HeavenSword,
    HolySword,
    RuneSword,
    Badelaire,
    SwordOfDawn,
    FistOfTulkas,
];
