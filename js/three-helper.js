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
        
        // 添加相机调试辅助对象 - 已禁用以提高性能
        // this.cameraHelper = new THREE.CameraHelper(this.camera);
        // this.scene.add(this.cameraHelper);
        
        // 创建WebGL渲染器
        this.createRenderer();
        
        // 创建灯光
        this.createLights();
        
        // 存储3D对象的映射
        this.objects = new Map();
        
        // 初始化玩家模型（不依赖纹理，可以立即创建）
        this.initPlayerModel();
        
        // 加载纹理 - 尝试使用预加载的纹理
        this.textures = {};
        
        // 直接测试加载草地纹理
        this.testLoadGrassTexture();
        
        // 检查是否有预加载的纹理可用
        if (window.preloadedTextures && window.preloadedTextures.length >= 6) {
            console.log('使用预加载的纹理');
            const [
                grassTexture,
                castleTowerTexture,
                brokenPillarTexture,
                gravestoneTexture,
                deadTreeTexture,
                torchTexture
            ] = window.preloadedTextures;
            
            // 使用预加载的纹理
            this.textures.grassTexture = grassTexture;
            this.textures.castleTower = castleTowerTexture;
            this.textures.brokenPillar = brokenPillarTexture;
            this.textures.gravestone = gravestoneTexture;
            this.textures.deadTree = deadTreeTexture;
            this.textures.torch = torchTexture;
            
            // 配置草地纹理重复
            if (this.textures.grassTexture) {
                this.textures.grassTexture.wrapS = THREE.RepeatWrapping;
                this.textures.grassTexture.wrapT = THREE.RepeatWrapping;
                this.textures.grassTexture.repeat.set(50, 50);
                
                console.log('使用预加载的草地纹理');
            }
            
            // 创建临时地面
            this.createTemporaryGround();
            
            // 刷新带有纹理的对象
            this.refreshTexturedObjects();
        } else {
            // 没有预加载纹理，创建临时地面并加载纹理
            console.log('没有找到预加载的纹理，创建临时地面并加载新纹理');
            this.createTemporaryGround();
            this.loadTextures();
        }
        
        console.log('ThreeHelper初始化完成');
    }
    
    // 创建临时地面和一些默认对象
    createTemporaryGround() {
        // 创建有颜色的地面
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x336633, // 更明显的绿色
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide // 确保平面的两面都可见
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // 旋转使平面水平
        ground.position.y = -10; // 略微下沉
        ground.receiveShadow = true; // 接收阴影
        this.scene.add(ground);
        this.objects.set('ground', ground);
        
        // 添加一些默认的3D对象，不依赖纹理，确保场景中有可见内容
        this.createDefaultObjects();
        
        console.log('创建了临时地面和默认对象');
    }
    
    // 创建默认的3D对象
    createDefaultObjects() {
        // 创建几个彩色立方体作为地标
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
        
        for (let i = 0; i < 5; i++) {
            const size = 30;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 0.2
            });
            
            const cube = new THREE.Mesh(geometry, material);
            
            // 放置在不同位置
            const distance = 200;
            const angle = i * Math.PI * 2 / 5;
            cube.position.set(
                Math.cos(angle) * distance,
                size / 2, // 确保在地面之上
                Math.sin(angle) * distance
            );
            
            this.scene.add(cube);
            this.objects.set(`landmark_${i}`, cube);
        }
        
        // 添加一个中心点标记
        const centerGeometry = new THREE.SphereGeometry(20, 16, 16);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
        centerSphere.position.set(0, 30, 0);
        this.scene.add(centerSphere);
        this.objects.set('center_marker', centerSphere);
    }
    
    // 创建地面
    createGround() {
        // 如果已存在地面，先移除
        const existingGround = this.objects.get('ground');
        if (existingGround) {
            this.scene.remove(existingGround);
            this.objects.delete('ground');
        }
        
        // 直接创建一个带有图案的地面
        this.createPatternGround();
        
        // 尝试加载纹理创建地面
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        
        // 创建纹理加载器并立即加载草地纹理
        const textureLoader = new THREE.TextureLoader();
        
        // 尝试多种路径加载方式
        const tryLoadPaths = [
            './images/grass_texture.png',  // 相对路径
            '/images/grass_texture.png',   // 根目录路径
            'images/grass_texture.png',    // 无前缀路径
            window.location.origin + '/images/grass_texture.png', // 绝对URL
        ];
        
        console.log('尝试加载草地纹理，使用多种路径:', tryLoadPaths);
        
        // 测试图像是否可访问
        const testImageExists = (url) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    console.log(`图像测试成功: ${url}, 尺寸: ${img.width}x${img.height}`);
                    resolve(true);
                };
                img.onerror = () => {
                    console.warn(`图像测试失败: ${url}`);
                    resolve(false);
                };
                img.src = url;
            });
        };
        
        // 先测试图像是否存在
        const checkImages = async () => {
            console.log('测试图像是否可访问...');
            
            for (const path of tryLoadPaths) {
                console.log(`测试图像路径: ${path}`);
                const exists = await testImageExists(path);
                if (exists) {
                    console.log(`找到可用图像: ${path}`);
                    
                    // 使用可访问的图像路径
                    loadTextureAndCreateGround(path);
                    return;
                }
            }
            
            // 如果所有路径都不可访问
            console.error('所有图像路径测试失败，使用备用地面');
            this.createColorGround();
        };
        
        // 加载纹理并创建地面
        const loadTextureAndCreateGround = (path) => {
            console.log(`开始加载纹理: ${path}`);
            
            textureLoader.load(
                path,
                (grassTexture) => {
                    console.log(`草地纹理加载成功: ${path}`);
                    console.log(`纹理信息: ${grassTexture.image.width}x${grassTexture.image.height}`);
                    
                    // 设置纹理参数
                    grassTexture.wrapS = THREE.RepeatWrapping;
                    grassTexture.wrapT = THREE.RepeatWrapping;
                    grassTexture.repeat.set(50, 50);
                    grassTexture.needsUpdate = true;
                    
                    // 记录纹理便于调试
                    this.grassTextureLoaded = grassTexture;
                    
                    // 使用MeshBasicMaterial，它不依赖光照，更容易看到纹理问题
                    const groundMaterial = new THREE.MeshBasicMaterial({
                        map: grassTexture,
                        side: THREE.DoubleSide
                    });
                    
                    // 确保材质更新
                    groundMaterial.needsUpdate = true;
                    
                    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
                    ground.rotation.x = -Math.PI / 2;
                    ground.position.y = -10;
                    ground.receiveShadow = true;
                    this.scene.add(ground);
                    this.objects.set('ground', ground);
                    
                    console.log('创建了带纹理的地面 - 使用BasicMaterial');
                },
                (progress) => {
                    console.log(`纹理加载进度: ${Math.round(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error(`纹理加载失败: ${path}`, error);
                    this.createColorGround();
                }
            );
        };
        
        // 开始检查图像
        checkImages();
    }
    
    // 创建带有明显图案的地面（强制使用程序生成图案，便于调试）
    createPatternGround() {
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        
        // 创建一个棋盘格纹理，确保可见
        const canvas = document.createElement('canvas');
        canvas.width = 512;  // 更大的尺寸
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 绘制醒目的棋盘格
        const gridSize = 64;  // 更大的格子
        for (let y = 0; y < canvas.height; y += gridSize) {
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.fillStyle = (x / gridSize + y / gridSize) % 2 === 0 ? '#ff0000' : '#0000ff';
                ctx.fillRect(x, y, gridSize, gridSize);
            }
        }
        
        // 创建一个明显的标记，确保纹理方向正确
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TOP', canvas.width/2, 50);
        ctx.fillText('BOTTOM', canvas.width/2, canvas.height-50);
        ctx.fillText('LEFT', 50, canvas.height/2);
        ctx.fillText('RIGHT', canvas.width-50, canvas.height/2);
        
        // 创建纹理
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);  // 减少重复次数，使文字可见
        texture.needsUpdate = true;
        
        // 使用BasicMaterial
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        // 创建地面
        const ground = new THREE.Mesh(groundGeometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -10;
        this.scene.add(ground);
        this.objects.set('debug_ground', ground);
        
        console.log('创建了带有明显图案的调试地面');
    }
    
    // 创建纯色地面（作为备用）
    createColorGround() {
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x336633,
            side: THREE.DoubleSide
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -10;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.objects.set('ground', ground);
        
        console.log('创建了纯色地面（草地纹理加载失败）- 使用BasicMaterial');
    }
    
    // 加载纹理
    loadTextures() {
        console.log('开始加载图像纹理...');
        
        // 创建纹理加载器
        const textureLoader = new THREE.TextureLoader();
        
        // 使用Promise加载所有纹理
        const loadTexture = (url) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(
                    url,
                    (texture) => {
                        console.log(`成功加载纹理: ${url}`);
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        console.error(`无法加载纹理 ${url}:`, error);
                        reject(error);
                    }
                );
            });
        };
        
        // 保留原有的纹理创建函数作为备用
        this.createColorTexture = this.createColorTexture || ((color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        });
        
        this.createGridTexture = this.createGridTexture || ((color1, color2, gridSize = 8) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = color1;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = color2;
            for (let y = 0; y < canvas.height; y += gridSize) {
                for (let x = 0; x < canvas.width; x += gridSize) {
                    if ((x / gridSize + y / gridSize) % 2 === 0) {
                        ctx.fillRect(x, y, gridSize, gridSize);
                    }
                }
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        });
        
        this.createPatternTexture = this.createPatternTexture || ((bgColor, patternColor) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = patternColor;
            ctx.beginPath();
            ctx.arc(canvas.width/2, canvas.height/2, canvas.width/4, 0, Math.PI * 2);
            ctx.fill();
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        });
        
        // 先用程序生成的纹理作为备用，避免加载过程中出现空白
        this.textures.grassTexture = this.createGridTexture('#336633', '#224422', 16);
        this.textures.castleTower = this.createPatternTexture('#666666', '#444444');
        this.textures.brokenPillar = this.createPatternTexture('#999999', '#777777');
        this.textures.gravestone = this.createColorTexture('#555555');
        this.textures.deadTree = this.createPatternTexture('#663300', '#442200');
        this.textures.torch = this.createPatternTexture('#663300', '#ffcc00');
        
        // 设置纹理重复属性
        this.textures.grassTexture.wrapS = THREE.RepeatWrapping;
        this.textures.grassTexture.wrapT = THREE.RepeatWrapping;
        this.textures.grassTexture.repeat.set(50, 50);
        
        console.log('已创建临时纹理，开始加载实际图像...');
        
        // 加载实际图像纹理
        Promise.all([
            loadTexture('./images/grass_texture.png'),
            loadTexture('./images/castle_tower.png'),
            loadTexture('./images/broken_pillar.png'),
            loadTexture('./images/gravestone.png'),
            loadTexture('./images/dead_tree.png'),
            loadTexture('./images/torch.png')
        ]).then(([
            grassTexture,
            castleTowerTexture,
            brokenPillarTexture,
            gravestoneTexture,
            deadTreeTexture,
            torchTexture
        ]) => {
            // 更新纹理对象
            this.textures.grassTexture = grassTexture;
            this.textures.castleTower = castleTowerTexture;
            this.textures.brokenPillar = brokenPillarTexture;
            this.textures.gravestone = gravestoneTexture;
            this.textures.deadTree = deadTreeTexture;
            this.textures.torch = torchTexture;
            
            // 配置纹理重复
            this.textures.grassTexture.wrapS = THREE.RepeatWrapping;
            this.textures.grassTexture.wrapT = THREE.RepeatWrapping;
            this.textures.grassTexture.repeat.set(50, 50);
            
            console.log('所有图像纹理加载完成，刷新对象');
            
            // 刷新纹理对象
            this.refreshTexturedObjects();
        }).catch(error => {
            console.error('加载图像纹理发生错误:', error);
            console.log('使用备用程序生成的纹理');
            // 已经有备用纹理，不需要额外处理
            this.refreshTexturedObjects();
        });
    }
    
    // 刷新使用纹理的对象
    refreshTexturedObjects() {
        // 重新创建地面（使用草地纹理）
        this.createGround(); // 直接调用createGround而不是修改现有ground对象
        
        // 重新创建背景对象
        this.createBackgroundObjects();
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
                                texture = this.createPatternTexture('#666666', '#444444');
                                break;
                            case 'brokenPillar':
                                texture = this.createPatternTexture('#999999', '#777777');
                                break;
                            case 'gravestone':
                                texture = this.createColorTexture('#555555');
                                break;
                            case 'deadTree':
                                texture = this.createPatternTexture('#663300', '#442200');
                                break;
                            case 'torch':
                                texture = this.createPatternTexture('#663300', '#ffcc00');
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
        
        // 配置纹理
        this.successTexture.wrapS = THREE.RepeatWrapping;
        this.successTexture.wrapT = THREE.RepeatWrapping;
        this.successTexture.repeat.set(20, 20);
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
} 