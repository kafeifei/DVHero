// 武器基类
class Weapon {
    constructor(name, description, damage, level = 1) {
        this.name = name;
        this.description = description;
        this.baseDamage = damage;
        this.level = level;
        this.cooldown = 0;
        this.maxCooldown = 30; // 帧数
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
        if (this.cooldown > 0) {
            this.cooldown--;
        }
    }

    canAttack() {
        return this.cooldown <= 0;
    }

    resetCooldown() {
        this.cooldown = this.maxCooldown;
    }

    // 获取水平攻击方向，将所有方向限制为左或右
    getHorizontalDirection(player) {
        if (player.facingDirection === 'left') {
            return Math.PI; // 左
        } else {
            return 0; // 右（默认）
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
        const direction = this.getHorizontalDirection(player);
        const range = 150;

        // 等级2以上同时攻击两侧
        const attackDirections = this.level >= 2 ? [0, Math.PI] : [direction];

        for (const angle of attackDirections) {
            for (let i = 0; i < this.attacks; i++) {
                setTimeout(() => {
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
                        height: 2,
                        piercing: true,
                    });
                }, i * 50); // 每次攻击间隔50毫秒
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

        // 限制为左右攻击
        const angle = this.getHorizontalDirection(player);

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

        // 根据当前盾牌类型发射不同投射物
        const angle = this.getHorizontalDirection(player);

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
            duration: 15,
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

        // 限制为左右攻击
        const angle = this.getHorizontalDirection(player);

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
                    30
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
                    20
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
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        const direction = player.facingDirection;
        const angle =
            direction === 'right'
                ? 0
                : direction === 'left'
                  ? Math.PI
                  : direction === 'up'
                    ? -Math.PI / 2
                    : Math.PI / 2;

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
        if (game.keys.z && this.specialAttackCooldown <= 0) {
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

            this.specialAttackCooldown = this.maxSpecialCooldown;
        }

        this.resetCooldown();
    }

    update(game) {
        super.update(game);

        if (this.specialAttackCooldown > 0) {
            this.specialAttackCooldown--;
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
        this.maxCooldown = 45;
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        const direction = player.facingDirection;
        const angle =
            direction === 'right'
                ? 0
                : direction === 'left'
                  ? Math.PI
                  : direction === 'up'
                    ? -Math.PI / 2
                    : Math.PI / 2;

        // 创建符文剑刃
        game.createProjectile({
            x: player.x,
            y: player.y,
            angle: angle,
            speed: 7,
            damage: this.getDamage(),
            range: 300,
            color: '#a040ff',
            width: 25,
            height: 25,
            piercing: true,
            shape: 'rune',
            rotateSpeed: 0.2,
            returning: true,
            returnAfter: 40, // 多少帧后返回
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

        const direction = player.facingDirection;
        const angle =
            direction === 'right'
                ? 0
                : direction === 'left'
                  ? Math.PI
                  : direction === 'up'
                    ? -Math.PI / 2
                    : Math.PI / 2;

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
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        const direction = player.facingDirection;
        const angle =
            direction === 'right'
                ? 0
                : direction === 'left'
                  ? Math.PI
                  : direction === 'up'
                    ? -Math.PI / 2
                    : Math.PI / 2;

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
        if (game.keys.x && this.summonCooldown <= 0) {
            this.summonSoldiers(game, player);
            this.summonCooldown = this.maxSummonCooldown;
        }

        this.resetCooldown();
    }

    summonSoldiers(game, player) {
        const soldierCount = 2 + Math.floor(this.level / 2); // 等级越高召唤越多
        const duration = 600; // 10秒存在时间

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

        if (this.summonCooldown > 0) {
            this.summonCooldown--;
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
    }

    attack(game, player) {
        if (!this.canAttack()) return;

        const direction = player.facingDirection;
        const angle =
            direction === 'right'
                ? 0
                : direction === 'left'
                  ? Math.PI
                  : direction === 'up'
                    ? -Math.PI / 2
                    : Math.PI / 2;

        // 更新连击计数
        if (this.comboTimer > 0) {
            this.comboCount = (this.comboCount + 1) % (this.maxCombo + 1);
            if (this.comboCount === 0) this.comboCount = 1;
        } else {
            this.comboCount = 1;
        }

        this.comboTimer = this.comboTimeout;

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
            duration: 10, // 非常短的持续时间
        });

        this.resetCooldown();
    }

    update(game) {
        super.update(game);

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) {
                this.comboCount = 0;
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
