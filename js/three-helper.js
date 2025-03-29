// Three.js辅助类
class ThreeHelper {
    constructor(game) {
        this.game = game;
        this.canvas3d = document.getElementById('game-canvas-3d');
        
        // 如果找不到canvas元素，则创建一个
        if (!this.canvas3d) {
            console.warn('找不到game-canvas-3d元素，创建新的canvas');
            this.canvas3d = document.createElement('canvas');
            this.canvas3d.id = 'game-canvas-3d';
            this.canvas3d.className = 'inactive';
            
            // 将新canvas添加到game-container中
            const container = document.getElementById('game-container');
            if (container) {
                container.appendChild(this.canvas3d);
            } else {
                // 如果找不到container，则添加到body
                document.body.appendChild(this.canvas3d);
            }
        }

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
        const aspectRatio = this.canvas3d.width / this.canvas3d.height;
        const viewSize = 800; // 增大视口高度，显示更多内容
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspectRatio / 2, 
            viewSize * aspectRatio / 2, 
            viewSize / 2, 
            -viewSize / 2, 
            1, 
            2000 // 增加远裁剪面的距离
        );
        
        // 将相机位置设置为俯视视角，稍微偏移以便更好地观察
        this.camera.position.set(200, 400, 200);
        this.camera.lookAt(0, 0, 0);
        
        // 添加相机调试辅助对象
        this.cameraHelper = new THREE.CameraHelper(this.camera);
        this.scene.add(this.cameraHelper);
        
        // 创建WebGL渲染器
        this.createRenderer();
        
        // 创建灯光
        this.createLights();
        
        // 存储3D对象的映射
        this.objects = new Map();
        
        // 初始化玩家模型（不依赖纹理，可以立即创建）
        this.initPlayerModel();
        
        // 创建临时地面和默认对象
        this.createTemporaryGround();
        
        // 加载纹理 - 不依赖游戏中的图像
        this.textures = {};
        this.loadTextures();
        
        console.log('ThreeHelper初始化完成');
    }
    
    // 创建临时地面和一些默认对象
    createTemporaryGround() {
        // 创建有颜色的地面
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x336633, // 更明显的绿色
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // 旋转使平面水平
        ground.position.y = -10; // 略微下沉
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
        
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            map: this.textures.grassTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // 旋转使平面水平
        ground.position.y = -10; // 略微下沉
        this.scene.add(ground);
        this.objects.set('ground', ground);
    }
    
    // 加载纹理
    loadTextures() {
        console.log('开始加载纹理...');
        
        // 使用内置的纹理，避免加载外部资源
        // 创建简单的彩色纹理
        const createColorTexture = (color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 64, 64);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };
        
        // 创建网格纹理
        const createGridTexture = (color1, color2, gridSize = 8) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // 填充背景
            ctx.fillStyle = color1;
            ctx.fillRect(0, 0, 64, 64);
            
            // 绘制网格
            ctx.fillStyle = color2;
            for (let y = 0; y < 64; y += gridSize) {
                for (let x = 0; x < 64; x += gridSize) {
                    if ((x / gridSize + y / gridSize) % 2 === 0) {
                        ctx.fillRect(x, y, gridSize, gridSize);
                    }
                }
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };
        
        // 创建图案纹理
        const createPatternTexture = (bgColor, patternColor) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // 填充背景
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, 64, 64);
            
            // 绘制图案
            ctx.fillStyle = patternColor;
            ctx.beginPath();
            ctx.arc(32, 32, 16, 0, Math.PI * 2);
            ctx.fill();
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };
        
        // 创建各种纹理
        this.textures.grassTexture = createGridTexture('#336633', '#224422', 16);
        this.textures.castleTower = createPatternTexture('#666666', '#444444');
        this.textures.brokenPillar = createPatternTexture('#999999', '#777777');
        this.textures.gravestone = createColorTexture('#555555');
        this.textures.deadTree = createPatternTexture('#663300', '#442200');
        this.textures.torch = createPatternTexture('#663300', '#ffcc00');
        
        // 设置纹理重复属性
        this.textures.grassTexture.wrapS = THREE.RepeatWrapping;
        this.textures.grassTexture.wrapT = THREE.RepeatWrapping;
        this.textures.grassTexture.repeat.set(20, 20);
        
        console.log('所有纹理创建完成，创建场景对象');
        
        // 所有纹理都已创建，刷新对象
        this.refreshTexturedObjects();
    }
    
    // 刷新使用纹理的对象
    refreshTexturedObjects() {
        // 重新创建地面（使用草地纹理）
        const ground = this.objects.get('ground');
        if (ground && this.textures.grassTexture) {
            ground.material.map = this.textures.grassTexture;
            ground.material.needsUpdate = true;
        }
        
        // 重新创建背景对象
        this.createBackgroundObjects();
    }
    
    // 创建WebGL渲染器
    createRenderer() {
        try {
            // 确保canvas没有其他上下文
            const existingContext = this.canvas3d.__context;
            if (existingContext) {
                console.warn('Canvas已经有了上下文：', existingContext);
            }
            
            // 确保canvas尺寸已设置
            if (this.canvas3d.width === 0 || this.canvas3d.height === 0) {
                this.canvas3d.width = 800;
                this.canvas3d.height = 600;
            }
            
            // 创建WebGL渲染器
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas3d,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            
            // 设置渲染器尺寸和像素比
            this.renderer.setSize(this.canvas3d.width, this.canvas3d.height);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(0x000000, 0); // 透明背景
            
            console.log('WebGL渲染器创建成功');
        } catch (error) {
            console.error("无法创建WebGL渲染器", error);
            // 记录更详细的错误信息
            if (!window.WebGLRenderingContext) {
                console.error("浏览器不支持WebGL");
            }
        }
    }
    
    // 清理Three.js资源
    dispose() {
        if (this.renderer) {
            // 从DOM中移除canvas
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            
            // 清理渲染器
            this.renderer.dispose();
            this.renderer = null;
        }
        
        // 清理场景中的对象
        while(this.scene.children.length > 0) { 
            this.scene.remove(this.scene.children[0]); 
        }
        
        // 清理材质和几何体
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
        
        // 清理纹理
        for (const key in this.textures) {
            if (this.textures[key]) {
                this.textures[key].dispose();
            }
        }
        
        this.objects.clear();
        this.scene = null;
        this.camera = null;
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
                
                if (!texture) {
                    console.warn(`纹理未加载: ${obj.type}，使用默认颜色`);
                    // 使用默认颜色
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
                
                // 创建一个精灵（始终面向相机的平面）
                const material = new THREE.SpriteMaterial({ 
                    map: texture,
                    color: 0xffffff, // 确保颜色是白色，不会改变纹理颜色
                    transparent: true
                });
                
                const sprite = new THREE.Sprite(material);
                
                // 设置位置和大小
                const scale = obj.scale || 1;
                sprite.position.set(
                    obj.x, 
                    height * scale / 2, // 高度位置
                    obj.y
                );
                sprite.scale.set(
                    100 * scale, 
                    100 * scale, 
                    1
                );
                
                // 添加到场景
                this.scene.add(sprite);
                this.objects.set(`background_${index}`, sprite);
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
        
        // 在xz平面跟随玩家，保持y轴高度不变
        const targetX = player.position.x;
        const targetZ = player.position.z;
        
        // 使用偏移量，以便有更好的视角
        this.camera.position.x = targetX + 200;
        this.camera.position.z = targetZ + 200;
        
        // 始终看向玩家
        this.camera.lookAt(targetX, 0, targetZ);
        
        // 更新相机辅助对象
        if (this.cameraHelper) {
            this.cameraHelper.update();
        }
    }
    
    // 更新场景状态，添加调试信息
    renderDebugInfo() {
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
    }
    
    // 渲染场景
    render() {
        if (!this.renderer) {
            console.warn('渲染器未初始化');
            return;
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
        } catch (e) {
            console.error('渲染场景时出错:', e);
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
        
        const aspectRatio = width / height;
        const viewSize = 800;
        
        this.camera.left = -viewSize * aspectRatio / 2;
        this.camera.right = viewSize * aspectRatio / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
        this.camera.updateProjectionMatrix();
        
        this.canvas3d.width = width;
        this.canvas3d.height = height;
        this.renderer.setSize(width, height);
    }
    
    // 创建灯光
    createLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // 增加环境光强度
        this.scene.add(ambientLight);
        
        // 主方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // 增加强度
        directionalLight.position.set(200, 400, 200); // 与相机位置相似
        directionalLight.lookAt(0, 0, 0);
        directionalLight.castShadow = true;
        
        // 设置阴影属性
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 2000;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        
        this.scene.add(directionalLight);
        
        // 添加辅助照明
        const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
        this.scene.add(hemisphereLight);
        
        // 添加灯光辅助对象
        const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 100);
        this.scene.add(directionalLightHelper);
    }
} 