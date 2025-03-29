// Three.js辅助类
class ThreeHelper {
    constructor(game) {
        this.game = game;
        this.canvas3d = document.getElementById('game-canvas-3d');

        // 初始化Three.js
        this.scene = new THREE.Scene();
        
        // 使用正交相机，更适合于俯视角游戏
        const aspectRatio = this.canvas3d.width / this.canvas3d.height;
        const viewSize = 600; // 视口高度，与游戏画布保持一致
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspectRatio / 2, 
            viewSize * aspectRatio / 2, 
            viewSize / 2, 
            -viewSize / 2, 
            1, 
            1000
        );
        
        // 将相机位置设置为俯视视角
        this.camera.position.set(0, 200, 0);
        this.camera.lookAt(0, 0, 0);
        this.camera.rotation.z = 0; // 让视角与2D版本一致
        
        // 创建WebGL渲染器
        this.createRenderer();
        
        // 创建灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 200, 100);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // 存储3D对象的映射
        this.objects = new Map();
        
        // 加载纹理 - 纹理加载完成后会自动创建地面和背景对象
        this.textures = {};
        this.loadTextures();
        
        // 初始化玩家模型（不依赖纹理，可以立即创建）
        this.initPlayerModel();
        
        // 创建临时地面，在纹理加载完成前显示
        this.createTemporaryGround();
    }
    
    // 创建临时地面
    createTemporaryGround() {
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // 旋转使平面水平
        ground.position.y = -10; // 略微下沉
        this.scene.add(ground);
        this.objects.set('ground', ground);
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
        // 使用THREE.TextureLoader创建纹理加载器
        const textureLoader = new THREE.TextureLoader();
        
        // 定义需要加载的图像类型
        const textureTypes = [
            'grassTexture', 'castleTower', 'brokenPillar', 
            'gravestone', 'deadTree', 'torch'
        ];
        
        this.texturesLoaded = 0;
        this.texturesTotal = textureTypes.length;
        
        // 检查游戏中的图像是否已加载
        const allImagesLoaded = textureTypes.every(type => 
            this.game.images[type] && this.game.images[type].complete);
        
        if (!allImagesLoaded) {
            console.warn('游戏图像尚未完全加载，等待中...');
            // 设置延迟后再次尝试
            setTimeout(() => this.loadTextures(), 500);
            return;
        }
        
        console.log('游戏图像已加载，创建3D纹理');
        
        // 从已加载的DOM图像创建Three.js纹理
        textureTypes.forEach(type => {
            try {
                // 从游戏图像中创建纹理
                this.textures[type] = new THREE.Texture(this.game.images[type]);
                this.textures[type].needsUpdate = true; // 必须设置，告诉Three.js纹理已更新
                this.texturesLoaded++;
                
                console.log(`已创建纹理: ${type}`);
                
                // 设置特定纹理属性
                if (type === 'grassTexture') {
                    this.textures[type].wrapS = THREE.RepeatWrapping;
                    this.textures[type].wrapT = THREE.RepeatWrapping;
                    this.textures[type].repeat.set(10, 10);
                }
            } catch (e) {
                console.error(`创建纹理失败: ${type}`, e);
            }
        });
        
        // 检查是否所有纹理都已创建
        if (this.texturesLoaded === this.texturesTotal) {
            console.log('所有纹理加载完成');
            this.refreshTexturedObjects();
        } else {
            console.warn(`只有${this.texturesLoaded}/${this.texturesTotal}个纹理加载成功`);
            // 即使有些纹理加载失败，也尝试创建对象
            this.refreshTexturedObjects();
        }
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
        const allTexturesLoaded = ['grassTexture', 'castleTower', 'brokenPillar', 'gravestone', 'deadTree', 'torch']
            .every(textureKey => this.textures[textureKey] !== undefined);
            
        if (!allTexturesLoaded) {
            console.warn('纹理尚未完全加载，延迟创建背景对象');
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
                    console.warn(`纹理未加载: ${obj.type}`);
                    return;
                }
                
                // 创建一个精灵（始终面向相机的平面）
                const material = new THREE.SpriteMaterial({ 
                    map: texture,
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
                    const pointLight = new THREE.PointLight(0xff9900, 1, 100);
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
        if (player) {
            this.camera.position.x = player.position.x;
            this.camera.position.z = player.position.z;
            this.camera.lookAt(player.position.x, 0, player.position.z);
        }
    }
    
    // 渲染场景
    render() {
        if (!this.renderer) return;
        
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
    }
    
    // 调整渲染器大小
    resize(width, height) {
        if (!this.renderer) return;
        
        const aspectRatio = width / height;
        const viewSize = 600;
        
        this.camera.left = -viewSize * aspectRatio / 2;
        this.camera.right = viewSize * aspectRatio / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
        this.camera.updateProjectionMatrix();
        
        this.canvas3d.width = width;
        this.canvas3d.height = height;
        this.renderer.setSize(width, height);
    }
} 