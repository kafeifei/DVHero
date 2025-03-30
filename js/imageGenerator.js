/**
 * Image generation functions
 */

export function generateGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const size = 128;

    // 背景色 - 深绿色
    ctx.fillStyle = '#1a5c1a';
    ctx.fillRect(0, 0, size, size);

    // 添加暗色变化
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = 1 + Math.random() * 4;

        ctx.fillStyle = `rgba(10, 40, 10, ${Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 添加草的纹理 - 短线条
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const length = 5 + Math.random() * 10;
        const width = 1 + Math.random();
        const angle = Math.random() * Math.PI;

        // 随机选择草的颜色 - 不同色调的绿色
        const greenValue = 60 + Math.floor(Math.random() * 30);
        ctx.strokeStyle = `rgb(20, ${greenValue}, 20)`;
        ctx.lineWidth = width;

        ctx.beginPath();
        ctx.moveTo(
            x - (Math.cos(angle) * length) / 2,
            y - (Math.sin(angle) * length) / 2
        );
        ctx.lineTo(
            x + (Math.cos(angle) * length) / 2,
            y + (Math.sin(angle) * length) / 2
        );
        ctx.stroke();
    }

    // 添加一些亮点
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = 0.5 + Math.random() * 1.5;

        ctx.fillStyle = `rgba(180, 255, 180, ${Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Directly return the canvas
    return canvas;
}

export function generateCastleTowerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布并设置透明背景
    ctx.clearRect(0, 0, width, height);

    // 绘制塔底部
    const baseWidth = width * 0.8;
    const towerHeight = height * 0.85;

    // 绘制主塔身
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo((width - baseWidth) / 2, height);
    ctx.lineTo((width - baseWidth) / 2, height - towerHeight);
    ctx.lineTo(
        (width - baseWidth) / 2 + baseWidth * 0.3,
        height - towerHeight - height * 0.05
    );
    ctx.lineTo(
        (width - baseWidth) / 2 + baseWidth * 0.7,
        height - towerHeight - height * 0.05
    );
    ctx.lineTo(
        (width - baseWidth) / 2 + baseWidth,
        height - towerHeight
    );
    ctx.lineTo((width - baseWidth) / 2 + baseWidth, height);
    ctx.closePath();
    ctx.fill();

    // 添加石头纹理
    ctx.fillStyle = '#333';
    for (let i = 0; i < 100; i++) {
        const x =
            (width - baseWidth) / 2 + Math.random() * baseWidth;
        const y = height - Math.random() * towerHeight;
        const stoneSize = 2 + Math.random() * 5;

        ctx.beginPath();
        ctx.arc(x, y, stoneSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // 塔顶
    const topWidth = baseWidth * 0.7;
    const topHeight = height * 0.2;
    const topStartY = height - towerHeight - height * 0.05;

    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.moveTo((width - topWidth) / 2, topStartY);
    ctx.lineTo((width - topWidth) / 2, topStartY - topHeight);
    ctx.lineTo(
        (width - topWidth) / 2 + topWidth,
        topStartY - topHeight
    );
    ctx.lineTo((width - topWidth) / 2 + topWidth, topStartY);
    ctx.closePath();
    ctx.fill();

    // 塔顶尖
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo((width - topWidth) / 2, topStartY - topHeight);
    ctx.lineTo(width / 2, topStartY - topHeight - height * 0.1);
    ctx.lineTo(
        (width - topWidth) / 2 + topWidth,
        topStartY - topHeight
    );
    ctx.closePath();
    ctx.fill();

    // 添加几个窗户
    ctx.fillStyle = '#111';
    const windowHeight = height * 0.06;
    const windowWidth = width * 0.1;

    // 顶层窗户
    ctx.fillRect(
        width / 2 - windowWidth / 2,
        topStartY - topHeight / 2 - windowHeight / 2,
        windowWidth,
        windowHeight
    );

    // 中层窗户
    const midY = height - towerHeight / 2;
    ctx.fillRect(
        width / 2 - windowWidth / 2,
        midY - windowHeight / 2,
        windowWidth,
        windowHeight
    );

    // 添加一些裂缝（恶魔城风格）
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
        const startX_crack = // Renamed startX to avoid conflict
            (width - baseWidth) / 2 + Math.random() * baseWidth;
        const startY_crack = height - Math.random() * towerHeight;

        ctx.beginPath();
        ctx.moveTo(startX_crack, startY_crack);

        let currentX = startX_crack;
        let currentY = startY_crack;

        // 创建锯齿形裂缝
        const segments = 3 + Math.floor(Math.random() * 4);
        const segmentLength = 5 + Math.random() * 15;

        for (let j = 0; j < segments; j++) {
            const angle = Math.random() * Math.PI * 2;
            currentX += Math.cos(angle) * segmentLength;
            currentY += Math.sin(angle) * segmentLength;

            ctx.lineTo(currentX, currentY);
        }

        ctx.stroke();
    }

    // Directly return the canvas
    return canvas;
}

export function generateBrokenPillarTexture() {
    const canvas = document.createElement('canvas');
    // Match the size from image_generator.html
    canvas.width = 100;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布并设置透明背景
    ctx.clearRect(0, 0, width, height);

    // 石柱主体
    const pillarWidth = width * 0.6;
    const pillarHeight = height * 0.9;
    const startX = (width - pillarWidth) / 2;

    // 决定断裂位置
    const breakPoint = height * (0.3 + Math.random() * 0.4);

    // 绘制底部
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(startX, height);
    ctx.lineTo(startX, height - breakPoint);

    // 创建不规则的断裂顶部
    const segments = 8;
    const segmentWidth = pillarWidth / segments;

    for (let i = 0; i <= segments; i++) {
        const xPos = startX + i * segmentWidth;
        let yOffset = 0;

        if (i > 0 && i < segments) {
            yOffset = (Math.random() - 0.5) * 20;
        }

        ctx.lineTo(xPos, height - breakPoint + yOffset);
    }

    ctx.lineTo(startX + pillarWidth, height);
    ctx.closePath();
    ctx.fill();

    // 添加石块纹理
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;

    // 水平线（石块间隙）
    for (
        let y = height;
        y > height - breakPoint;
        y -= 10 + Math.random() * 10
    ) {
        ctx.beginPath();
        ctx.moveTo(startX, y);

        let lastX = startX;
        let lastY = y;

        // 创建不规则的线条
        const lineSegments = 5;
        const lineSegmentWidth = pillarWidth / lineSegments;

        for (let i = 1; i <= lineSegments; i++) {
            const xPos = startX + i * lineSegmentWidth;
            let yOffset = (Math.random() - 0.5) * 5;

            ctx.lineTo(xPos, lastY + yOffset);
            lastY += yOffset;
        }

        ctx.stroke();
    }

    // 垂直线（石块间隙）
    for (
        let x = startX + 15;
        x < startX + pillarWidth;
        x += 15 + Math.random() * 10
    ) {
        let startY_line = height; // Renamed startY
        let endY = height - breakPoint + (Math.random() - 0.5) * 15;

        ctx.beginPath();
        ctx.moveTo(x, startY_line);

        // 创建不规则的线条
        const lineSegments = 3 + Math.floor(Math.random() * 3);
        const lineSegmentHeight = (startY_line - endY) / lineSegments;

        for (let i = 1; i < lineSegments; i++) {
            const yPos = startY_line - i * lineSegmentHeight;
            let xOffset = (Math.random() - 0.5) * 5;

            ctx.lineTo(x + xOffset, yPos);
        }

        ctx.lineTo(x, endY);
        ctx.stroke();
    }

    // 添加一些裂缝
    ctx.strokeStyle = '#222';
    for (let i = 0; i < 10; i++) {
        const cracksX = startX + Math.random() * pillarWidth;
        const cracksY = height - Math.random() * breakPoint;

        ctx.beginPath();
        ctx.moveTo(cracksX, cracksY);

        const length = 5 + Math.random() * 15;
        const angle = Math.random() * Math.PI * 2;

        ctx.lineTo(
            cracksX + Math.cos(angle) * length,
            cracksY + Math.sin(angle) * length
        );

        ctx.stroke();
    }
    // Directly return the canvas
    return canvas;
}

export function generateGravestoneTexture() {
    const canvas = document.createElement('canvas');
    // Match the size from image_generator.html
    canvas.width = 80;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布并设置透明背景
    ctx.clearRect(0, 0, width, height);

    // 墓碑形状 - 随机选择样式
    const style = Math.floor(Math.random() * 3);
    const stoneWidth = width * 0.7;
    const stoneHeight = height * 0.8;
    const startX = (width - stoneWidth) / 2;
    const startY = height - stoneHeight;

    // 主体颜色
    ctx.fillStyle = '#777';

    switch (style) {
        case 0: // 圆顶
            ctx.beginPath();
            ctx.moveTo(startX, height);
            ctx.lineTo(startX, startY + stoneHeight * 0.3);
            ctx.quadraticCurveTo(
                width / 2,
                startY - stoneHeight * 0.1,
                startX + stoneWidth,
                startY + stoneHeight * 0.3
            );
            ctx.lineTo(startX + stoneWidth, height);
            ctx.closePath();
            ctx.fill();
            break;

        case 1: // 尖顶
            ctx.beginPath();
            ctx.moveTo(startX, height);
            ctx.lineTo(startX, startY + stoneHeight * 0.3);
            ctx.lineTo(width / 2, startY);
            ctx.lineTo(
                startX + stoneWidth,
                startY + stoneHeight * 0.3
            );
            ctx.lineTo(startX + stoneWidth, height);
            ctx.closePath();
            ctx.fill();
            break;

        case 2: // 十字架顶
            const crossWidth = stoneWidth * 0.5;
            const crossHeight = stoneHeight * 0.3;

            ctx.beginPath();
            ctx.moveTo(startX, height);
            ctx.lineTo(startX, startY + stoneHeight * 0.4);
            ctx.lineTo(
                width / 2 - crossWidth / 2,
                startY + stoneHeight * 0.4
            );
            ctx.lineTo(width / 2 - crossWidth / 2, startY);
            ctx.lineTo(width / 2 + crossWidth / 2, startY);
            ctx.lineTo(
                width / 2 + crossWidth / 2,
                startY + stoneHeight * 0.4
            );
            ctx.lineTo(
                startX + stoneWidth,
                startY + stoneHeight * 0.4
            );
            ctx.lineTo(startX + stoneWidth, height);
            ctx.closePath();
            ctx.fill();
            break;
    }

    // 添加纹理
    ctx.fillStyle = '#555';
    for (let i = 0; i < 50; i++) {
        const dotX = startX + Math.random() * stoneWidth;
        const dotY = startY + Math.random() * stoneHeight;
        const dotSize = 1 + Math.random() * 2;

        ctx.beginPath();
        ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // 添加裂缝
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < 5; i++) {
        const crackStartX = startX + Math.random() * stoneWidth;
        const crackStartY = startY + Math.random() * stoneHeight;

        ctx.beginPath();
        ctx.moveTo(crackStartX, crackStartY);

        let currentX = crackStartX;
        let currentY = crackStartY;

        const segments = 2 + Math.floor(Math.random() * 3);
        const length = 5 + Math.random() * 10;

        for (let j = 0; j < segments; j++) {
            const angle = Math.random() * Math.PI * 2;
            currentX += Math.cos(angle) * length;
            currentY += Math.sin(angle) * length;

            ctx.lineTo(currentX, currentY);
        }

        ctx.stroke();
    }

    // 添加墓志铭线条
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    const textY = startY + stoneHeight * 0.6;
    const lineSpacing = 5;

    for (let i = 0; i < 3; i++) {
        const lineY = textY + i * lineSpacing;
        const lineWidth = stoneWidth * (0.5 - i * 0.1);

        ctx.beginPath();
        ctx.moveTo(width / 2 - lineWidth / 2, lineY);
        ctx.lineTo(width / 2 + lineWidth / 2, lineY);
        ctx.stroke();
    }
    // Directly return the canvas
    return canvas;
}

export function generateDeadTreeTexture() {
    const canvas = document.createElement('canvas');
    // Match the size from image_generator.html
    canvas.width = 200;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布并设置透明背景
    ctx.clearRect(0, 0, width, height);

    // 树干
    const trunkWidth = width * 0.15;
    const trunkHeight = height * 0.7;
    const startX = width / 2;
    const startY = height;

    ctx.strokeStyle = '#442';
    ctx.lineWidth = trunkWidth;
    ctx.lineCap = 'round';

    // 主干
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY - trunkHeight);
    ctx.stroke();

    // 递归绘制树枝
    function drawBranch(x, y, length, angle, width_branch, depth) { // Renamed width
        if (depth <= 0) return;

        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        ctx.strokeStyle = `rgb(${68 - depth * 5}, ${68 - depth * 5}, ${34 - depth * 3})`;
        ctx.lineWidth = width_branch;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 分支
        const branchCount = 1 + Math.floor(Math.random() * 3);

        for (let i = 0; i < branchCount; i++) {
            const branchAngle = angle + (Math.random() - 0.5) * 1.5;
            const branchLength =
                length * (0.5 + Math.random() * 0.3);
            const branchWidth = width_branch * (0.5 + Math.random() * 0.3);

            drawBranch(
                endX,
                endY,
                branchLength,
                branchAngle,
                branchWidth,
                depth - 1
            );
        }
    }

    // 绘制主要分支
    const mainBranchCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < mainBranchCount; i++) {
        const y_branch = // Renamed y
            startY - trunkHeight * (0.3 + Math.random() * 0.6);
        const angle_branch = // Renamed angle
            (i % 2 === 0 ? -1 : 1) *
            (Math.PI / 4 + (Math.random() * Math.PI) / 4);
        const length_branch = trunkHeight * (0.3 + Math.random() * 0.3); // Renamed length
        const width_branch = trunkWidth * (0.3 + Math.random() * 0.3); // Renamed width

        drawBranch(startX, y_branch, length_branch, angle_branch, width_branch, 3);
    }
    // Directly return the canvas
    return canvas;
}

export function generateTorchTexture() {
    const canvas = document.createElement('canvas');
    // Match the size from image_generator.html
    canvas.width = 50;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布并设置透明背景
    ctx.clearRect(0, 0, width, height);

    // 火把柄
    const handleWidth = width * 0.3;
    const handleHeight = height * 0.7;
    const startX = width / 2 - handleWidth / 2;
    const startY = height - handleHeight;

    ctx.fillStyle = '#654321'; // 木柄颜色
    ctx.fillRect(startX, startY, handleWidth, handleHeight);

    // 添加木纹
    ctx.strokeStyle = '#543210';
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
        const lineY = startY + Math.random() * handleHeight;

        ctx.beginPath();
        ctx.moveTo(startX, lineY);
        ctx.lineTo(startX + handleWidth, lineY);
        ctx.stroke();
    }

    // 火把头
    const headWidth = width * 0.5;
    const headHeight = height * 0.2;
    const headX = width / 2 - headWidth / 2;
    const headY = startY - headHeight;

    ctx.fillStyle = '#a52a2a'; // 火把包裹物（布）
    ctx.fillRect(headX, headY, headWidth, headHeight);

    // 添加纹理
    ctx.strokeStyle = '#801818';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < 6; i++) {
        const lineX = headX + Math.random() * headWidth;

        ctx.beginPath();
        ctx.moveTo(lineX, headY);
        ctx.lineTo(lineX, headY + headHeight);
        ctx.stroke();
    }

    // 火焰
    const flameWidth = headWidth * 1.2;
    const flameHeight = height * 0.3;
    const flameX = width / 2;
    const flameY = headY;

    // 创建火焰渐变
    const gradient = ctx.createRadialGradient(
        flameX,
        flameY,
        0,
        flameX,
        flameY,
        flameWidth / 2
    );

    gradient.addColorStop(0, 'rgba(255, 255, 150, 0.9)');
    gradient.addColorStop(0.2, 'rgba(255, 200, 50, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 100, 0, 0.7)');
    gradient.addColorStop(0.8, 'rgba(200, 50, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');

    ctx.fillStyle = gradient;

    // 绘制不规则火焰形状
    ctx.beginPath();
    ctx.moveTo(flameX, flameY - flameHeight);

    // 左侧火焰曲线
    ctx.quadraticCurveTo(
        flameX - flameWidth / 4,
        flameY - flameHeight * 0.7,
        flameX - flameWidth / 2,
        flameY
    );

    // 底部
    ctx.quadraticCurveTo(
        flameX,
        flameY - flameHeight * 0.2,
        flameX + flameWidth / 2,
        flameY
    );

    // 右侧火焰曲线
    ctx.quadraticCurveTo(
        flameX + flameWidth / 4,
        flameY - flameHeight * 0.7,
        flameX,
        flameY - flameHeight
    );

    ctx.fill();
    // Directly return the canvas
    return canvas;
} 