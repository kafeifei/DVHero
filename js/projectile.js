import { Utils } from './utils.js';

// 投射物类
export class Projectile {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.angle = options.angle || 0;
        this.speed = (options.speed || 5) * 60; // 转换为像素/秒
        this.damage = options.damage || 1;
        this.range = options.range || 200;
        this.distanceTraveled = 0;
        this.color = options.color || '#ffffff';
        this.width = options.width || 5;
        this.height = options.height || 5;
        this.shape = options.shape || 'rect';
        this.piercing = options.piercing || false;
        this.knockback = options.knockback || 0;
        this.hitEnemies = new Set(); // 用于穿透武器记录已经击中的敌人
        this.active = true;
        this.rotateSpeed = (options.rotateSpeed || 0) * Math.PI * 2; // 转换为弧度/秒
        this.rotation = options.rotation || 0;
        this.id = Projectile.nextId++;
        this.duration = options.duration !== undefined ? options.duration : undefined; // 不转换，可能为undefined
        this.fixed = options.fixed || false;
        this.fixedTarget = options.fixedTarget;
        this.fixedOffset = options.fixedOffset;
        this.returning = options.returning || false;
        this.returnTimer = 0;
        this.returnAfter = options.returnAfter || 0;
        this.returnTarget = options.returnTarget;
        this.homing = options.homing || false;
        this.homingTarget = options.homingTarget;
        this.homingStrength = options.homingStrength || 0.1;
        this.onUpdate = options.onUpdate;
        this.onHit = options.onHit;
        this.onKill = options.onKill;

        // 动态属性
        this.radius = Math.max(this.width, this.height) / 2;
    }

    update(game, deltaTime) {
        // 默认deltaTime为1/60秒
        deltaTime = deltaTime || 1/60;
        
        // 自定义更新逻辑
        if (this.onUpdate) {
            this.onUpdate(this, deltaTime);
        }

        // 更新持续时间
        if (this.duration !== undefined) {
            this.duration -= deltaTime;
            if (this.duration <= 0) {
                this.active = false;
                return;
            }
        }

        // 更新旋转
        if (this.rotateSpeed) {
            this.rotation += this.rotateSpeed * deltaTime;
        }

        // 固定位置的投射物（如围绕玩家的护盾）
        if (this.fixed && this.fixedTarget) {
            if (this.rotateSpeed) {
                // 如果有旋转，更新偏移位置
                const angle =
                    Math.atan2(this.fixedOffset.y, this.fixedOffset.x) +
                    this.rotation;
                const distance = Math.sqrt(
                    this.fixedOffset.x * this.fixedOffset.x +
                        this.fixedOffset.y * this.fixedOffset.y
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
            // 修复：将returnAfter从帧数转换为秒数，以支持基于时间的返回逻辑
            const returnAfterInSeconds = this.returnAfter / 60;
            
            if (this.returnTimer < returnAfterInSeconds) {
                this.returnTimer += deltaTime;
            } else if (this.returnTarget) {
                // 计算回到目标的方向
                const dx = this.returnTarget.x - this.x;
                const dy = this.returnTarget.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > this.speed * deltaTime) {
                    // 增加返回速度为原来的1.5倍，加快返回
                    const returnSpeed = this.speed * 1.5;
                    // 移动向目标
                    this.angle = Math.atan2(dy, dx);
                    this.x += Math.cos(this.angle) * returnSpeed * deltaTime;
                    this.y += Math.sin(this.angle) * returnSpeed * deltaTime;
                    
                    // 即使在返回过程中也要继续旋转
                    if (this.rotateSpeed) {
                        this.rotation += this.rotateSpeed * deltaTime;
                    }
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

            // 平滑转向 - 基于时间的调整
            this.angle += angleDiff * this.homingStrength * (60 * deltaTime);
        }

        // 移动
        const moveDistance = this.speed * deltaTime;
        this.x += Math.cos(this.angle) * moveDistance;
        this.y += Math.sin(this.angle) * moveDistance;

        // 更新已移动距离
        this.distanceTraveled += moveDistance;

        // 检查是否超出范围
        if (this.distanceTraveled >= this.range) {
            this.active = false;
        }
    }

    draw(ctx, offsetX, offsetY) {
        ctx.save();

        // 移动到投射物位置
        ctx.translate(this.x + offsetX, this.y + offsetY);

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
                // 符文剑形状（改为类似剑的形状）
                // 绘制剑形状主体
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2); // 剑尖
                ctx.lineTo(this.width/4, -this.height/3); // 右侧剑身
                ctx.lineTo(this.width/6, 0); // 右侧剑柄
                ctx.lineTo(this.width/4, this.height/3); // 右侧剑格
                ctx.lineTo(0, this.height/2); // 剑柄底部
                ctx.lineTo(-this.width/4, this.height/3); // 左侧剑格
                ctx.lineTo(-this.width/6, 0); // 左侧剑柄
                ctx.lineTo(-this.width/4, -this.height/3); // 左侧剑身
                ctx.closePath();
                ctx.fill();
                
                // 添加符文效果
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                // 在剑身上添加一个符文图案
                ctx.beginPath();
                ctx.moveTo(-this.width/8, -this.height/6);
                ctx.lineTo(this.width/8, -this.height/6);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(0, -this.height/4);
                ctx.lineTo(0, 0);
                ctx.stroke();
                break;

            case 'star':
                // 星形
                {
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
                }

            default: // rect
                {
                    ctx.fillRect(
                        -this.width / 2,
                        -this.height / 2,
                        this.width,
                        this.height
                    );
                    break;
                }
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

// 添加静态计数器用于生成唯一ID
Projectile.nextId = 1;

// 经验球类
export class ExperienceOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = 5 + Math.min(5, value);
        this.magnetDistance = 150;
        this.baseSpeed = 60; // 转换为像素/秒
        this.maxSpeed = 480; // 转换为像素/秒
        this.color = '#00ffff';
        this.pulseSpeed = 3; // 转换为Hz
        this.pulseAmount = 0.2;
        this.pulse = 0;
        this.pulseOffset = Math.random() * Math.PI * 2; // 添加随机初始相位
        this.attractionRange = this.magnetDistance; // 修复缺失的吸引范围属性
        this.speed = this.baseSpeed; // 添加初始速度
        this.id = ExperienceOrb.nextId++;
    }

    update(game, deltaTime) {
        deltaTime = deltaTime || 1/60;
        
        // 更新脉动效果
        this.pulse = (this.pulse + this.pulseSpeed * deltaTime * Math.PI * 2) % (Math.PI * 2);

        // 计算与玩家的距离
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 如果玩家在吸引范围内，经验球会被吸引
        if (distance < this.attractionRange) {
            // 计算吸引力（距离越近吸引力越大）
            const attraction = 1 - distance / this.attractionRange;
            this.speed = this.baseSpeed + attraction * (this.maxSpeed - this.baseSpeed);

            // 移向玩家
            if (distance > 0) {
                this.x += (dx / distance) * this.speed * deltaTime;
                this.y += (dy / distance) * this.speed * deltaTime;
            }
        }
    }

    draw(ctx, offsetX, offsetY) {
        try {
            // 脉动效果 - 使用this.pulse而不是依赖Date.now()
            const pulseValue = Math.sin(this.pulse + this.pulseOffset);
            const pulse = 1 + pulseValue * this.pulseAmount;
            const displayRadius = this.radius * pulse;

            if (isNaN(displayRadius) || !isFinite(displayRadius)) {
                // 防止无效半径，使用默认值
                console.warn('经验球半径无效，使用默认值');
                return;
            }

            // 绘制经验球
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.arc(
                this.x + offsetX,
                this.y + offsetY,
                displayRadius,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // 绘制发光效果 - 添加错误处理
            const innerRadius = displayRadius * 0.5;
            const outerRadius = displayRadius * 1.5;

            if (
                isNaN(innerRadius) ||
                !isFinite(innerRadius) ||
                isNaN(outerRadius) ||
                !isFinite(outerRadius)
            ) {
                return; // 防止创建径向渐变时使用无效半径
            }

            const gradient = ctx.createRadialGradient(
                this.x + offsetX,
                this.y + offsetY,
                innerRadius,
                this.x + offsetX,
                this.y + offsetY,
                outerRadius
            );
            gradient.addColorStop(0, 'rgba(94, 186, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(94, 186, 255, 0)');

            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.arc(
                this.x + offsetX,
                this.y + offsetY,
                outerRadius,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } catch (e) {
            console.error('经验球绘制错误:', e);
        }
    }
}

// 添加静态计数器用于生成唯一ID
ExperienceOrb.nextId = 1;

// 粒子效果
export class Particle {
    constructor(x, y, color, size, lifetime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime; // 以秒为单位
        this.initialLifetime = lifetime;
        this.speedX = (Math.random() - 0.5) * 120; // 转换为像素/秒
        this.speedY = (Math.random() - 0.5) * 120;
    }

    update(deltaTime) {
        deltaTime = deltaTime || 1/60;
        
        this.x += this.speedX * deltaTime;
        this.y += this.speedY * deltaTime;
        this.lifetime -= deltaTime;
    }

    draw(ctx, offsetX, offsetY) {
        const alpha = this.lifetime / this.initialLifetime;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(
            this.x + offsetX,
            this.y + offsetY,
            this.size * alpha,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// 视觉效果类
export class Effect {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.color = options.color || '#ffffff';
        this.radius = options.radius || 10;
        this.duration = options.duration || 0.5; // 以秒为单位
        this.initialDuration = this.duration;
    }

    update(deltaTime) {
        deltaTime = deltaTime || 1/60;
        this.duration -= deltaTime;
    }

    draw(ctx, offsetX, offsetY) {
        const ratio = this.duration / this.initialDuration;
        const currentRadius = this.radius * (2 - ratio);

        ctx.globalAlpha = ratio;
        ctx.beginPath();
        ctx.arc(
            this.x + offsetX,
            this.y + offsetY,
            currentRadius,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}
