// Three.js辅助类
class ThreeHelper {
    constructor(game) {
        this.game = game;
        this.canvas3d = game.canvas3d;
        
        // 确保canvas尺寸正确
        if (this.canvas3d.width === 0 || this.canvas3d.height === 0) {
            this.canvas3d.width = 800;
            this.canvas3d.height = 600;
            console.log(`设置canvas3d尺寸: ${this.canvas3d.width}x${this.canvas3d.height}`);
        }

        // 初始化Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222); // 设置场景背景色
        
        console.log(`初始化相机，canvas尺寸: ${this.canvas3d.width}x${this.canvas3d.height}`);
        
        // 使用正交相机，更适合于俯视角游戏
        // 固定视口尺寸，避免多次切换导致放大
        this.viewSize = 800; // 固定视口高度
        const aspectRatio = this.canvas3d.width / this.canvas3d.height;
        this.camera = new THREE.OrthographicCamera(
            -this.viewSize * aspectRatio / 2, 
            this.viewSize * aspectRatio / 2, 
            this.viewSize / 2, 
            -this.viewSize / 2, 
            1, 
            2000 // 远裁剪面的距离
        );
        
        // 将相机位置设置为纯俯视视角，避免45度角造成坐标系混淆
        this.camera.position.set(0, 600, 0); // 使用纯俯视角度
        this.camera.lookAt(0, 0, 0);
        
        // 创建WebGL渲染器
        this.createRenderer();
        
        // 创建灯光
        this.createLights();
        
        // 存储3D对象的映射
        this.objects = new Map();
        
        // 初始化玩家模型（不依赖纹理，可以立即创建）
        this.initPlayerModel();
        
        // 创建简化版地面
        this.createSimpleGround();
        
        // 创建默认对象
        this.createDefaultObjects();
        
        console.log('ThreeHelper初始化完成');
    }
    
    // 创建默认3D对象
    createDefaultObjects() {
        // 此方法在新版本中不再需要，但保留空方法以兼容现有代码
        console.log('createDefaultObjects被调用 - 此方法现在是空的');
    }
    
    // 创建简化版地面，直接使用2D模式同样的平铺方式
    createSimpleGround() {
        console.log('创建简化版地面');
        
        // 创建几何体 - 大尺寸以确保覆盖视野
        const groundGeometry = new THREE.PlaneGeometry(3000, 3000);
        
        // 使用程序化生成的草地纹理代替加载图片
        const grassTexture = this.generateGrassTexture();
        
        // 设置纹理平铺参数
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        
        // 设置重复次数
        const repeatX = 3000 / 128;
        const repeatY = 3000 / 128;
        grassTexture.repeat.set(repeatX, repeatY);
        
        // 纹理过滤 - 使用NearestFilter避免边缘模糊
        grassTexture.magFilter = THREE.NearestFilter;
        grassTexture.minFilter = THREE.NearestFilter;
        grassTexture.generateMipmaps = false; // 关闭mipmap避免边缘混合
        grassTexture.needsUpdate = true;
        
        // 创建材质
        const groundMaterial = new THREE.MeshBasicMaterial({
            map: grassTexture,
            side: THREE.DoubleSide
        });
        
        // 创建地面网格
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // 旋转使平面水平
        ground.position.y = -10; // 略微下沉
        this.scene.add(ground);
        this.objects.set('ground', ground);
        
        // 添加暗色叠加，匹配2D模式中的 rgba(20, 20, 40, 0.3)
        const overlayGeometry = new THREE.PlaneGeometry(3000, 3000);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: 0x14142A, // RGB(20, 20, 40)
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.rotation.x = -Math.PI / 2;
        overlay.position.y = -9; // 略高于地面
        this.scene.add(overlay);
        this.objects.set('ground_overlay', overlay);
        
        console.log('地面创建完成，使用程序生成的草地纹理');
    }
    
    // 生成草地纹理
    generateGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // 背景颜色 - 深绿色
        ctx.fillStyle = '#1a5c1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加草的纹理
        const grassCount = 100 + Math.floor(Math.random() * 50); // 随机数量的草
        const grassColors = ['#267326', '#1a5c1a', '#0f4c0f', '#3b8f3b', '#2d7d2d'];
        
        for (let i = 0; i < grassCount; i++) {
            // 随机位置
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            
            // 随机大小
            const size = 2 + Math.random() * 5;
            
            // 随机颜色
            const colorIndex = Math.floor(Math.random() * grassColors.length);
            ctx.fillStyle = grassColors[colorIndex];
            
            // 绘制草
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            // 基础形状 - 简单椭圆或圆形
            const method = Math.random() > 0.5 ? 'rect' : 'arc';
            if (method === 'rect') {
                // 随机旋转矩形
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.random() * Math.PI);
                ctx.fillRect(-size/2, -size/3, size, size/1.5);
                ctx.restore();
            } else {
                // 椭圆或圆形
                const radiusX = size;
                const radiusY = size * (0.7 + Math.random() * 0.6);
                ctx.ellipse(x, y, radiusX, radiusY, Math.random() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // 添加一些噪点增加纹理感
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 1.5;
            const alpha = Math.random() * 0.3;
            
            // 随机颜色的噪点
            const r = 10 + Math.floor(Math.random() * 60);
            const g = 60 + Math.floor(Math.random() * 120);
            const b = 10 + Math.floor(Math.random() * 60);
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fillRect(x, y, size, size);
        }
        
        // 确保四个边缘相同，实现无缝拼接
        // 复制上边缘到下边缘
        const topEdge = ctx.getImageData(0, 0, canvas.width, 2);
        ctx.putImageData(topEdge, 0, canvas.height - 2);
        
        // 复制左边缘到右边缘
        const leftEdge = ctx.getImageData(0, 0, 2, canvas.height);
        ctx.putImageData(leftEdge, canvas.width - 2, 0);
        
        // 创建THREE.js纹理
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    // 生成城堡塔纹理
    generateCastleTowerTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // 背景色 - 灰色
        ctx.fillStyle = '#666666';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加砖块纹理
        const brickRows = 8;
        const bricksPerRow = 6;
        const brickWidth = canvas.width / bricksPerRow;
        const brickHeight = canvas.height / brickRows;
        
        for (let row = 0; row < brickRows; row++) {
            // 交错排列砖块
            const offset = row % 2 === 0 ? 0 : brickWidth / 2;
            
            for (let col = 0; col < bricksPerRow + (row % 2); col++) {
                // 随机砖块颜色变化
                const shade = 0.9 + Math.random() * 0.2; // 10%至30%的阴影变化
                const baseColor = 102; // #666666 灰色的RGB值
                const brickColor = Math.floor(baseColor * shade);
                ctx.fillStyle = `rgb(${brickColor}, ${brickColor}, ${brickColor})`;
                
                // 绘制砖块，留一点点空隙作为砂浆
                ctx.fillRect(
                    offset + col * brickWidth + 1, 
                    row * brickHeight + 1,
                    brickWidth - 2,
                    brickHeight - 2
                );
            }
        }
        
        // 添加一些随机划痕和损坏
        const scratchCount = 20 + Math.floor(Math.random() * 30);
        for (let i = 0; i < scratchCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const length = 2 + Math.random() * 10;
            const angle = Math.random() * Math.PI * 2;
            
            ctx.strokeStyle = `rgba(40, 40, 40, ${0.3 + Math.random() * 0.4})`;
            ctx.lineWidth = 1 + Math.random();
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length
            );
            ctx.stroke();
        }
        
        // 创建THREE.js纹理
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    // 生成破碎柱子纹理
    generateBrokenPillarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // 背景色 - 浅灰色
        ctx.fillStyle = '#999999';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加柱子的凹槽纹理
        const grooveCount = 6; // 柱子上的凹槽数量
        const grooveWidth = canvas.width / grooveCount;
        
        for (let i = 0; i < grooveCount; i++) {
            // 随机灰度变化
            const shade = 0.8 + Math.random() * 0.4; // 20%至60%的阴影变化
            const baseColor = 153; // #999999 浅灰色的RGB值
            const grooveColor = Math.floor(baseColor * shade);
            
            // 确定凹槽区域
            const x = i * grooveWidth;
            
            // 绘制凹槽（凸起和阴影）
            ctx.fillStyle = `rgb(${grooveColor}, ${grooveColor}, ${grooveColor})`;
            ctx.fillRect(x, 0, grooveWidth, canvas.height);
            
            // 添加高光和阴影以创建3D效果
            const highlightWidth = grooveWidth * 0.2;
            
            // 高光（左侧）
            const gradient1 = ctx.createLinearGradient(x, 0, x + highlightWidth, 0);
            gradient1.addColorStop(0, `rgba(255, 255, 255, 0.4)`);
            gradient1.addColorStop(1, `rgba(255, 255, 255, 0)`);
            ctx.fillStyle = gradient1;
            ctx.fillRect(x, 0, highlightWidth, canvas.height);
            
            // 阴影（右侧）
            const gradient2 = ctx.createLinearGradient(x + grooveWidth - highlightWidth, 0, x + grooveWidth, 0);
            gradient2.addColorStop(0, `rgba(0, 0, 0, 0)`);
            gradient2.addColorStop(1, `rgba(0, 0, 0, 0.3)`);
            ctx.fillStyle = gradient2;
            ctx.fillRect(x + grooveWidth - highlightWidth, 0, highlightWidth, canvas.height);
        }
        
        // 添加破损效果
        const crackCount = 5 + Math.floor(Math.random() * 10);
        for (let i = 0; i < crackCount; i++) {
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            const length = 10 + Math.random() * 40;
            const angle = Math.random() * Math.PI * 2;
            
            // 绘制裂缝
            ctx.strokeStyle = 'rgba(40, 40, 40, 0.6)';
            ctx.lineWidth = 1 + Math.random() * 2;
            
            // 创建不规则裂缝
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            const segments = 3 + Math.floor(Math.random() * 3);
            let currentX = startX;
            let currentY = startY;
            let currentAngle = angle;
            
            for (let j = 0; j < segments; j++) {
                const segmentLength = length / segments * (0.7 + Math.random() * 0.6);
                currentAngle += (Math.random() - 0.5) * Math.PI / 4; // 每段偏转一点
                
                currentX += Math.cos(currentAngle) * segmentLength;
                currentY += Math.sin(currentAngle) * segmentLength;
                
                ctx.lineTo(currentX, currentY);
            }
            
            ctx.stroke();
        }
        
        // 创建THREE.js纹理
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    // 生成墓碑纹理
    generateGravestoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // 背景色 - 深灰色
        ctx.fillStyle = '#555555';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加纹理和细节
        // 首先是一些随机噪点
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 1.5;
            const alpha = Math.random() * 0.2;
            
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(x, y, size, size);
        }
        
        // 添加一些白色噪点代表磨损
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random();
            const alpha = Math.random() * 0.1;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(x, y, size, size);
        }
        
        // 添加一些随机划痕
        const scratchCount = 15 + Math.floor(Math.random() * 15);
        for (let i = 0; i < scratchCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const length = 5 + Math.random() * 15;
            const angle = Math.random() * Math.PI * 2;
            
            ctx.strokeStyle = `rgba(30, 30, 30, ${0.3 + Math.random() * 0.2})`;
            ctx.lineWidth = 0.5 + Math.random() * 1.5;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length
            );
            ctx.stroke();
        }
        
        // 添加一些假文字（就像刻在墓碑上的）
        const addTextLines = Math.random() > 0.3; // 70%的概率添加文字线条
        if (addTextLines) {
            const lineCount = 3 + Math.floor(Math.random() * 3);
            const startY = canvas.height / 3;
            const lineHeight = canvas.height / 10;
            
            ctx.strokeStyle = 'rgba(50, 50, 50, 0.7)';
            
            for (let i = 0; i < lineCount; i++) {
                const y = startY + i * lineHeight;
                const lineWidth = 30 + Math.random() * 40;
                const x = (canvas.width - lineWidth) / 2;
                
                ctx.lineWidth = 1 + Math.random() * 2;
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + lineWidth, y);
                ctx.stroke();
            }
        }
        
        // 创建THREE.js纹理
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    // 生成枯树纹理
    generateDeadTreeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // 背景色 - 深棕色
        ctx.fillStyle = '#663300';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加树皮纹理
        // 首先是垂直纹理
        const stripCount = 8 + Math.floor(Math.random() * 8);
        for (let i = 0; i < stripCount; i++) {
            const x = Math.random() * canvas.width;
            const width = 3 + Math.random() * 10;
            const height = canvas.height;
            
            // 随机棕色调
            const r = 102 + Math.floor(Math.random() * 30);
            const g = 51 + Math.floor(Math.random() * 20);
            const b = 0 + Math.floor(Math.random() * 10);
            
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, 0, width, height);
        }
        
        // 添加横向纹理（节疤）
        const knotCount = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < knotCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radiusX = 5 + Math.random() * 15;
            const radiusY = 4 + Math.random() * 10;
            
            // 较深色的棕色
            const r = 82 + Math.floor(Math.random() * 20);
            const g = 41 + Math.floor(Math.random() * 10);
            const b = 0;
            
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            
            // 绘制椭圆节疤
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            
            // 添加节疤中心的特征
            ctx.fillStyle = `rgb(${r-20}, ${g-10}, ${b})`;
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX/2, radiusY/2, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 添加细微纹理细节
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            const alpha = Math.random() * 0.3;
            
            // 随机深浅色
            const isDark = Math.random() > 0.5;
            if (isDark) {
                ctx.fillStyle = `rgba(60, 30, 0, ${alpha})`;
            } else {
                ctx.fillStyle = `rgba(120, 70, 20, ${alpha})`;
            }
            
            ctx.fillRect(x, y, size, size);
        }
        
        // 创建THREE.js纹理
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    // 生成火把纹理
    generateTorchTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // 背景色 - 透明
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制火把柄 - 棕色木棍
        const handleWidth = canvas.width / 5;
        const handleHeight = canvas.height * 0.8;
        const handleX = (canvas.width - handleWidth) / 2;
        
        ctx.fillStyle = '#663300';
        ctx.fillRect(handleX, canvas.height / 5, handleWidth, handleHeight);
        
        // 添加木纹
        for (let i = 0; i < 10; i++) {
            const y = (canvas.height / 5) + Math.random() * handleHeight;
            const width = handleWidth * (0.6 + Math.random() * 0.4);
            const x = handleX + (handleWidth - width) / 2;
            
            // 深棕色线条
            ctx.strokeStyle = 'rgba(60, 30, 0, 0.5)';
            ctx.lineWidth = 1 + Math.random();
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + width, y);
            ctx.stroke();
        }
        
        // 绘制火把顶部 - 火焰部分
        const flameWidth = handleWidth * 2.5;
        const flameHeight = canvas.height / 3;
        const flameX = (canvas.width - flameWidth) / 2;
        const flameY = canvas.height / 10;
        
        // 创建火焰的径向渐变
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, flameY + flameHeight / 2, flameHeight / 8,
            canvas.width / 2, flameY + flameHeight / 2, flameHeight
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 0, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 50, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        
        // 绘制椭圆形火焰
        ctx.beginPath();
        ctx.ellipse(
            canvas.width / 2, 
            flameY + flameHeight / 2,
            flameWidth / 2,
            flameHeight / 2,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // 在火焰中添加一些亮点
        for (let i = 0; i < 30; i++) {
            const x = canvas.width / 2 + (Math.random() - 0.5) * flameWidth * 0.7;
            const y = flameY + flameHeight / 2 + (Math.random() - 0.5) * flameHeight * 0.7;
            const radius = 1 + Math.random() * 3;
            
            ctx.fillStyle = 'rgba(255, 255, 200, 0.7)';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 创建THREE.js纹理
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    // 创建WebGL渲染器
    createRenderer() {
        try {
            // 如果已经有渲染器，先清理
            if (this.renderer) {
                console.log('清理现有渲染器...');
                this.renderer.dispose();
                this.renderer.forceContextLoss();
                this.renderer = null;
            }
            
            // 简化渲染器创建过程，不传递GL上下文，让THREE.js自己创建
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas3d,
                antialias: true,
                alpha: true,
                powerPreference: 'default'
            });
            
            // 设置渲染器基本参数
            this.renderer.setSize(this.canvas3d.width, this.canvas3d.height);
            this.renderer.setPixelRatio(1); // 使用1:1的像素比，提高性能
            this.renderer.setClearColor(0x222222, 1);
            
            // 启用阴影
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 更柔和的阴影
            
            console.log('WebGL渲染器创建成功');
            return true;
        } catch (error) {
            console.error("无法创建WebGL渲染器", error);
            
            // 尝试使用备用选项创建
            try {
                console.log("尝试使用备用选项创建渲染器...");
                this.renderer = new THREE.WebGLRenderer({
                    canvas: this.canvas3d,
                    antialias: false,
                    alpha: false,
                    precision: 'lowp',
                    powerPreference: 'low-power'
                });
                
                this.renderer.setSize(this.canvas3d.width, this.canvas3d.height);
                this.renderer.setPixelRatio(1);
                this.renderer.setClearColor(0x222222, 1);
                
                // 尝试启用阴影，但使用更基础的阴影类型
                try {
                    this.renderer.shadowMap.enabled = true;
                    this.renderer.shadowMap.type = THREE.BasicShadowMap; // 基础阴影，性能更好
                } catch (err) {
                    console.warn('无法启用阴影', err);
                }
                
                console.log('备用渲染器创建成功');
                return true;
            } catch (e) {
                console.error("备用渲染器创建也失败", e);
                return false;
            }
        }
    }
    
    // 清理Three.js资源
    dispose() {
        if (this.renderer) {
            // 不再从DOM中移除canvas，只清理渲染器资源
            // 之前的代码:
            // if (this.renderer.domElement.parentNode) {
            //     this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            // }
            
            // 清理渲染器
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            this.renderer.domElement.__webglFramebuffer = null;
            this.renderer = null;
        }
        
        // 清理场景中的对象
        while(this.scene && this.scene.children.length > 0) { 
            const object = this.scene.children[0];
            this.scene.remove(object); 
            // 清理对象资源
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
        
        // 清理材质和几何体
        if (this.objects) {
            this.objects.forEach((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.objects.clear();
        }
        
        // 清理纹理
        if (this.textures) {
            for (const key in this.textures) {
                if (this.textures[key]) {
                    this.textures[key].dispose();
                }
            }
            this.textures = {};
        }
        
        this.scene = null;
        this.camera = null;
        // this.cameraHelper = null;
        
        console.log('已清理Three.js资源');
    }
    
    // 重置函数，用于重新开始游戏时
    reset() {
        // 清除所有3D对象（除了地面和灯光）
        this.objects.forEach((object, key) => {
            if (!key.startsWith('background_') && key !== 'ground') {
                this.scene.remove(object);
                this.objects.delete(key);
            }
        });
        
        // 重新初始化玩家模型
        this.initPlayerModel();
    }
    
    // 创建背景对象
    createBackgroundObjects() {
        console.log('开始创建背景对象...');
        
        if (!this.game.backgroundObjects || this.game.backgroundObjects.length === 0) {
            console.warn('没有找到背景对象数据');
            return;
        }
        
        // 清除现有的背景对象
        this.objects.forEach((object, key) => {
            if (key.startsWith('background_') || key.startsWith('torch_light_')) {
                this.scene.remove(object);
                this.objects.delete(key);
            }
        });
        
        // 检查纹理是否已加载
        const textureKeys = Object.keys(this.textures);
        if (textureKeys.length === 0) {
            console.warn('纹理尚未创建，延迟创建背景对象');
            return;
        }
        
        let createdCount = 0;
        
        // 遍历游戏中的背景对象
        this.game.backgroundObjects.forEach((obj, index) => {
            try {
                let texture;
                let height = 0;
                
                // 根据对象类型选择纹理
                switch(obj.type) {
                    case 'castleTower':
                        texture = this.textures.castleTower;
                        height = obj.height || 80;
                        break;
                    case 'brokenPillar':
                        texture = this.textures.brokenPillar;
                        height = 30;
                        break;
                    case 'gravestone':
                        texture = this.textures.gravestone;
                        height = 20;
                        break;
                    case 'deadTree':
                        texture = this.textures.deadTree;
                        height = 40;
                        break;
                    case 'torch':
                        texture = this.textures.torch;
                        height = 25;
                        break;
                    default:
                        console.warn(`未知的背景对象类型: ${obj.type}`);
                        return;
                }
                
                // 验证纹理可用性
                if (!texture) {
                    console.warn(`纹理未加载: ${obj.type}，使用默认颜色`);
                    // 尝试重新生成纹理
                    try {
                        switch(obj.type) {
                            case 'castleTower':
                                texture = this.generateCastleTowerTexture();
                                break;
                            case 'brokenPillar':
                                texture = this.generateBrokenPillarTexture();
                                break;
                            case 'gravestone':
                                texture = this.generateGravestoneTexture();
                                break;
                            case 'deadTree':
                                texture = this.generateDeadTreeTexture();
                                break;
                            case 'torch':
                                texture = this.generateTorchTexture();
                                break;
                        }
                    } catch (e) {
                        console.error('创建备用纹理失败', e);
                    }
                    
                    // 如果仍然没有纹理，使用默认材质
                    if (!texture) {
                        const geometry = new THREE.BoxGeometry(30, height, 30);
                        const material = new THREE.MeshStandardMaterial({
                            color: 0x777777,
                            emissive: 0x222222,
                            emissiveIntensity: 0.2
                        });
                        
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.position.set(obj.x, height/2, obj.y);
                        
                        this.scene.add(mesh);
                        this.objects.set(`background_${index}`, mesh);
                        createdCount++;
                        return;
                    }
                }
                
                // 为背景对象使用3D网格而不是精灵，以便更好地显示纹理
                let mesh;
                
                // 判断对象类型，使用不同的几何体
                if (obj.type === 'castleTower') {
                    // 使用圆柱体作为塔
                    const geometry = new THREE.CylinderGeometry(20, 25, height, 8);
                    const material = new THREE.MeshStandardMaterial({
                        map: texture,
                        roughness: 0.8,
                        metalness: 0.2
                    });
                    mesh = new THREE.Mesh(geometry, material);
                } else if (obj.type === 'deadTree') {
                    // 使用高细长的圆柱体和球体组合作为树
                    const trunkGeo = new THREE.CylinderGeometry(5, 8, height * 0.8, 6);
                    const trunkMaterial = new THREE.MeshStandardMaterial({
                        color: 0x663300,
                        roughness: 0.9
                    });
                    const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
                    
                    const foliageGeo = new THREE.SphereGeometry(20, 8, 6);
                    const foliageMaterial = new THREE.MeshStandardMaterial({
                        color: 0x225522,
                        roughness: 0.9
                    });
                    const foliage = new THREE.Mesh(foliageGeo, foliageMaterial);
                    foliage.position.y = height * 0.5;
                    
                    mesh = new THREE.Group();
                    mesh.add(trunk);
                    mesh.add(foliage);
                } else if (obj.type === 'torch') {
                    // 使用简单的几何形状组合
                    const stickGeo = new THREE.CylinderGeometry(2, 2, height, 6);
                    const stickMaterial = new THREE.MeshStandardMaterial({
                        color: 0x663300,
                        roughness: 0.9
                    });
                    const stick = new THREE.Mesh(stickGeo, stickMaterial);
                    
                    const flameGeo = new THREE.SphereGeometry(5, 8, 6);
                    const flameMaterial = new THREE.MeshStandardMaterial({
                        color: 0xff9900,
                        emissive: 0xff9900,
                        emissiveIntensity: 0.8
                    });
                    const flame = new THREE.Mesh(flameGeo, flameMaterial);
                    flame.position.y = height * 0.6;
                    
                    mesh = new THREE.Group();
                    mesh.add(stick);
                    mesh.add(flame);
                } else {
                    // 其他对象使用简单的Box
                    const geometry = new THREE.BoxGeometry(30, height, 30);
                    const material = new THREE.MeshStandardMaterial({
                        map: texture,
                        roughness: 0.8,
                        metalness: 0.2
                    });
                    mesh = new THREE.Mesh(geometry, material);
                }
                
                // 设置位置和大小
                const scale = obj.scale || 1;
                
                // 如果是组合对象，直接设置位置
                if (mesh instanceof THREE.Group) {
                    mesh.position.set(obj.x, 0, obj.y);
                    mesh.scale.set(scale, scale, scale);
                } else {
                    mesh.position.set(obj.x, height * scale / 2, obj.y);
                }
                
                // 添加到场景
                this.scene.add(mesh);
                this.objects.set(`background_${index}`, mesh);
                createdCount++;
                
                // 为火把添加点光源
                if (obj.type === 'torch') {
                    const pointLight = new THREE.PointLight(0xff9900, 2, 100); // 增强光照强度
                    pointLight.position.set(obj.x, height * scale, obj.y);
                    this.scene.add(pointLight);
                    this.objects.set(`torch_light_${index}`, pointLight);
                }
            } catch (e) {
                console.error(`创建背景对象时出错: ${e.message}`);
            }
        });
        
        console.log(`创建了 ${createdCount} 个背景对象`);
    }
    
    // 初始化玩家模型
    initPlayerModel() {
        const geometry = new THREE.SphereGeometry(this.game.player.radius, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: this.game.player.color,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const playerMesh = new THREE.Mesh(geometry, material);
        playerMesh.position.set(this.game.player.x, 0, this.game.player.y);
        playerMesh.castShadow = true;
        
        this.scene.add(playerMesh);
        this.objects.set('player', playerMesh);
    }
    
    // 创建敌人模型
    createEnemyModel(enemy) {
        let geometry;
        
        // 根据不同敌人类型创建不同形状
        switch(enemy.constructor.name) {
            case 'Zombie':
                geometry = new THREE.BoxGeometry(enemy.radius * 2, enemy.radius * 2, enemy.radius * 2);
                break;
            case 'SkeletonSoldier':
                geometry = new THREE.ConeGeometry(enemy.radius, enemy.radius * 2, 4);
                break;
            case 'MedusaHead':
                geometry = new THREE.OctahedronGeometry(enemy.radius, 0);
                break;
            default:
                geometry = new THREE.SphereGeometry(enemy.radius, 8, 8);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: enemy.color,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const enemyMesh = new THREE.Mesh(geometry, material);
        enemyMesh.position.set(enemy.x, 0, enemy.y);
        enemyMesh.castShadow = true;
        
        this.scene.add(enemyMesh);
        this.objects.set(`enemy_${enemy.id}`, enemyMesh);
        
        return enemyMesh;
    }
    
    // 创建投射物模型
    createProjectileModel(projectile) {
        const geometry = new THREE.SphereGeometry(projectile.radius, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: projectile.color,
            emissive: projectile.color,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.7
        });
        
        const projectileMesh = new THREE.Mesh(geometry, material);
        projectileMesh.position.set(projectile.x, 10, projectile.y);
        
        this.scene.add(projectileMesh);
        this.objects.set(`projectile_${projectile.id}`, projectileMesh);
        
        return projectileMesh;
    }
    
    // 创建经验球模型
    createExpOrbModel(expOrb) {
        const geometry = new THREE.IcosahedronGeometry(expOrb.radius, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.7
        });
        
        const orbMesh = new THREE.Mesh(geometry, material);
        orbMesh.position.set(expOrb.x, 5, expOrb.y);
        
        this.scene.add(orbMesh);
        this.objects.set(`expOrb_${expOrb.id}`, orbMesh);
        
        return orbMesh;
    }
    
    // 更新对象位置
    updateObjectPosition(key, x, y, z = 0) {
        const object = this.objects.get(key);
        if (object) {
            object.position.set(x, z, y); // 注意：Three.js中y是上方，我们使用z作为y
        }
    }
    
    // 移除对象
    removeObject(key) {
        const object = this.objects.get(key);
        if (object) {
            this.scene.remove(object);
            this.objects.delete(key);
        }
    }
    
    // 更新相机位置
    updateCamera() {
        const player = this.objects.get('player');
        if (!player) {
            console.warn('找不到玩家对象，相机不会跟随');
            return;
        }
        
        // 在xz平面跟随玩家，保持纯俯视角度
        const targetX = player.position.x;
        const targetZ = player.position.z;
        
        // 直接在玩家上方，无偏移
        this.camera.position.x = targetX;
        this.camera.position.z = targetZ;
        
        // 始终从上方正视玩家
        this.camera.lookAt(targetX, 0, targetZ);
        
        // 更新相机辅助对象
        // if (this.cameraHelper) {
        //     this.cameraHelper.update();
        // }
    }
    
    // 更新场景状态，添加调试信息
    renderDebugInfo() {
        // 已禁用调试信息显示
        return;
        
        // 以下代码已禁用
        /*
        // 创建或获取调试信息容器
        let debugContainer = document.getElementById('three-debug-info');
        
        if (!debugContainer) {
            debugContainer = document.createElement('div');
            debugContainer.id = 'three-debug-info';
            debugContainer.style.position = 'absolute';
            debugContainer.style.top = '100px';
            debugContainer.style.left = '10px';
            debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            debugContainer.style.color = 'white';
            debugContainer.style.padding = '10px';
            debugContainer.style.borderRadius = '5px';
            debugContainer.style.fontFamily = 'monospace';
            debugContainer.style.fontSize = '12px';
            debugContainer.style.zIndex = '1000';
            debugContainer.style.maxWidth = '300px';
            debugContainer.style.overflow = 'auto';
            document.body.appendChild(debugContainer);
        }
        
        // 生成调试信息
        const playerObj = this.objects.get('player');
        const stats = {
            'Objects in scene': this.scene.children.length,
            'Canvas size': `${this.canvas3d.width}x${this.canvas3d.height}`,
            'Player position': playerObj ? `x:${Math.round(playerObj.position.x)}, z:${Math.round(playerObj.position.z)}` : 'N/A',
            'Camera position': `x:${Math.round(this.camera.position.x)}, y:${Math.round(this.camera.position.y)}, z:${Math.round(this.camera.position.z)}`,
            'Background objects': Array.from(this.objects.keys()).filter(k => k.startsWith('background_')).length,
            'WebGL context': this.renderer ? 'Active' : 'Not available',
            'Textures loaded': Object.keys(this.textures).length
        };
        
        // 更新HTML
        debugContainer.innerHTML = '<h3>Three.js Debug</h3>' + 
            Object.entries(stats).map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`).join('');
        */
    }
    
    // 渲染场景
    render() {
        if (!this.renderer) {
            console.warn('渲染器未初始化');
            return false;
        }
        
        // 如果有成功加载的纹理，并且还没有创建过成功纹理地面，则创建一个
        if (this.successTexture && !this.successGroundCreated) {
            this.createSuccessGround();
            this.successGroundCreated = true;
        }
        
        try {
            // 更新场景中的动画对象
            this.animateObjects();
            
            // 更新相机位置
            this.updateCamera();
            
            // 更新调试信息
            this.renderDebugInfo();
            
            // 渲染场景
            this.renderer.render(this.scene, this.camera);
            return true;
        } catch (e) {
            console.error('渲染场景时出错:', e);
            return false;
        }
    }
    
    // 动画更新
    animateObjects() {
        // 更新中心标记，使其旋转
        const centerMarker = this.objects.get('center_marker');
        if (centerMarker) {
            centerMarker.rotation.y += 0.01;
        }
        
        // 更新其他动画对象
        for (let i = 0; i < 5; i++) {
            const landmark = this.objects.get(`landmark_${i}`);
            if (landmark) {
                landmark.rotation.y += 0.01;
                
                // 让标记上下浮动
                const time = Date.now() * 0.001;
                const offset = Math.sin(time + i) * 5;
                landmark.position.y = landmark.userData.baseHeight || 15;
                landmark.position.y += offset;
                
                // 存储基础高度
                if (!landmark.userData.baseHeight) {
                    landmark.userData.baseHeight = landmark.position.y;
                }
            }
        }
    }
    
    // 调整渲染器大小
    resize(width, height) {
        if (!this.renderer) return;
        
        // 确保宽高比例正确
        const aspectRatio = width / height;
        // 使用相同的viewSize，避免缩放问题
        
        // 更新相机参数
        this.camera.left = -this.viewSize * aspectRatio / 2;
        this.camera.right = this.viewSize * aspectRatio / 2;
        this.camera.top = this.viewSize / 2;
        this.camera.bottom = -this.viewSize / 2;
        this.camera.updateProjectionMatrix();
        
        console.log(`调整渲染器尺寸: ${width}x${height}`);
        this.canvas3d.width = width;
        this.canvas3d.height = height;
        this.renderer.setSize(width, height);
    }
    
    // 创建灯光
    createLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // 增加环境光强度
        this.scene.add(ambientLight);
        
        // 主方向光 - 从上方直射
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(0, 600, 0); // 与相机位置一致，纯垂直方向
        directionalLight.lookAt(0, 0, 0);
        directionalLight.castShadow = true;
        
        // 设置阴影属性
        directionalLight.shadow.mapSize.width = 2048; // 增加阴影贴图分辨率
        directionalLight.shadow.mapSize.height = 2048; // 增加阴影贴图分辨率
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 2000;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        
        this.scene.add(directionalLight);
        
        // 添加辅助照明 - 半球光提供更均匀的环境光照
        const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
        this.scene.add(hemisphereLight);
        
        // 添加灯光辅助对象 - 已禁用以提高性能
        // const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 100);
        // this.scene.add(directionalLightHelper);
        
        // 添加额外的辅助照明 - 背面光源，确保物体背面也有照明
        const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        backLight.position.set(0, 100, 300); // 从玩家后方照射
        backLight.lookAt(0, 0, 0);
        this.scene.add(backLight);
        
        // 记录主光源
        this.mainLight = directionalLight;
    }
    
    // 测试直接加载草地纹理
    testLoadGrassTexture() {
        console.log('======= 直接测试加载草地纹理 =======');
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = 'anonymous'; // 尝试解决可能的跨域问题
        
        // 尝试不同的图片格式
        const testPaths = [
            './images/grass_texture.png',
            './images/grass_texture.jpg',
            'images/grass_texture.png',
            '/images/grass_texture.png',
            window.location.origin + '/images/grass_texture.png',
            'https://via.placeholder.com/512x512/00ff00/ffffff?text=Grass'  // 外部图像，确保纹理加载器工作
        ];
        
        console.log('测试路径列表:', testPaths);
        
        // 依次尝试每个路径
        const testNext = (index) => {
            if (index >= testPaths.length) {
                console.log('所有路径测试完成');
                return;
            }
            
            const path = testPaths[index];
            console.log(`测试路径 [${index+1}/${testPaths.length}]: ${path}`);
            
            try {
                textureLoader.load(
                    path,
                    (texture) => {
                        console.log(`✅ 纹理加载成功: ${path}`);
                        console.log(`  - 尺寸: ${texture.image.width}x${texture.image.height}`);
                        console.log(`  - 类型: ${texture.image.src.endsWith('.png') ? 'PNG' : (texture.image.src.endsWith('.jpg') ? 'JPG' : '未知')}`);
                        
                        // 保存成功加载的纹理
                        this.successTexture = texture;
                        
                        // 测试下一个路径
                        testNext(index + 1);
                    },
                    (progress) => {
                        if (progress.lengthComputable) {
                            console.log(`  加载进度: ${Math.round(progress.loaded / progress.total * 100)}%`);
                        }
                    },
                    (error) => {
                        console.error(`❌ 纹理加载失败: ${path}`);
                        console.error(`  错误信息: ${error.message || '未知错误'}`);
                        
                        // 测试下一个路径
                        testNext(index + 1);
                    }
                );
            } catch (e) {
                console.error(`❌ 加载过程出错: ${path}`);
                console.error(`  错误信息: ${e.message}`);
                
                // 测试下一个路径
                testNext(index + 1);
            }
        };
        
        // 开始测试第一个路径
        testNext(0);
    }
    
    // 计算合适的重复系数，用于创建地面
    calculateTextureRepeat(texture, isGrass = false) {
        // 获取纹理尺寸
        const textureWidth = texture.image.width;
        const textureHeight = texture.image.height;
        console.log(`纹理尺寸: ${textureWidth}x${textureHeight}`);
        
        // 地面尺寸为2000x2000
        // 对于128x128像素的草地纹理
        if (isGrass) {
            // 对于grass_texture.png (128x128)，1个纹理单元在现实世界中应该大概为1-2米
            // 在游戏中，假设角色直径约为30单位，约1.5米
            // 因此1米约等于20游戏单位
            // 所以一个草地纹理的理想尺寸应为20-40游戏单位
            
            // 地面尺寸为2000，希望每个纹理单元在30-40单位左右
            // 重复次数应为: 2000 / 30 ≈ 66次
            const repeatX = 66;
            const repeatY = 66;
            
            console.log(`草地纹理使用固定重复次数: ${repeatX}x${repeatY}`);
            return { x: repeatX, y: repeatY };
        }
        
        // 对于其他纹理，使用动态计算
        // 地面尺寸/纹理尺寸*0.5=纹理应该重复的次数
        const repeatX = 2000 / textureWidth * 0.5;
        const repeatY = 2000 / textureHeight * 0.5;
        
        console.log(`计算得到的重复次数: ${repeatX.toFixed(2)}x${repeatY.toFixed(2)}`);
        return { x: repeatX, y: repeatY };
    }
    
    // 使用成功加载的纹理创建地面
    createSuccessGround() {
        console.log('使用成功加载的纹理创建地面');
        
        // 如果没有成功加载的纹理，返回
        if (!this.successTexture) {
            console.warn('没有成功加载的纹理，无法创建地面');
            return;
        }
        
        // 移除所有现有地面
        ['ground', 'debug_ground'].forEach(key => {
            const existingGround = this.objects.get(key);
            if (existingGround) {
                this.scene.remove(existingGround);
                this.objects.delete(key);
            }
        });
        
        // 创建新的地面几何体
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        
        // 计算基于纹理实际尺寸的合适重复次数
        const { x: repeatX, y: repeatY } = this.calculateTextureRepeat(this.successTexture, true);
        
        // 配置纹理
        this.successTexture.wrapS = THREE.RepeatWrapping;
        this.successTexture.wrapT = THREE.RepeatWrapping;
        this.successTexture.repeat.set(repeatX, repeatY);
        this.successTexture.needsUpdate = true;
        
        // 创建材质 - 使用BasicMaterial确保可见
        const groundMaterial = new THREE.MeshBasicMaterial({
            map: this.successTexture,
            side: THREE.DoubleSide
        });
        
        // 创建地面
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -10;
        this.scene.add(ground);
        this.objects.set('success_ground', ground);
        
        console.log('成功创建带纹理的地面!');
    }
    
    // 添加回refreshTexturedObjects方法，以便兼容game.js中的调用
    refreshTexturedObjects() {
        console.log('调用了旧的refreshTexturedObjects方法，该方法已被重构');
        // 这个方法在旧版本中用于刷新地面和背景对象的纹理
        // 在新版本中不需要调用，因为地面已在构造函数中创建
        
        // 如果场景中还没有地面，可以创建一个
        if (!this.objects.has('ground')) {
            this.createSimpleGround();
        }
        
        // 如果有背景对象数据，可以尝试创建背景对象
        if (this.game.backgroundObjects && this.game.backgroundObjects.length > 0) {
            // 简单加载背景图像
            this.loadBackgroundImages();
        }
    }
    
    // 加载背景对象图像
    loadBackgroundImages() {
        // 使用简单的方法加载背景对象图像
        const textureLoader = new THREE.TextureLoader();
        
        // 创建纹理对象存储结构
        this.textures = this.textures || {};
        
        // 加载背景对象所需的图像
        const imagesToLoad = [
            {key: 'castleTower', path: './images/castle_tower.png'},
            {key: 'brokenPillar', path: './images/broken_pillar.png'},
            {key: 'gravestone', path: './images/gravestone.png'},
            {key: 'deadTree', path: './images/dead_tree.png'},
            {key: 'torch', path: './images/torch.png'}
        ];
        
        // 开始加载图像
        let loadedCount = 0;
        imagesToLoad.forEach(img => {
            textureLoader.load(
                img.path,
                (texture) => {
                    console.log(`加载背景图像成功: ${img.key}`);
                    this.textures[img.key] = texture;
                    loadedCount++;
                    
                    // 所有图像加载完成后创建背景对象
                    if (loadedCount === imagesToLoad.length) {
                        this.createBackgroundObjects();
                    }
                },
                undefined,
                (error) => {
                    console.error(`加载背景图像失败: ${img.key}`, error);
                    // 即使失败也继续计数，确保进程能够继续
                    loadedCount++;
                    
                    if (loadedCount === imagesToLoad.length) {
                        this.createBackgroundObjects();
                    }
                }
            );
        });
    }
} 