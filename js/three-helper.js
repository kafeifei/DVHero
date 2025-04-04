import * as THREE from 'three';
import { generateGrassTexture } from './imageGenerator.js'; // Import the texture generator
import CONFIG from './config.js'; // 导入配置文件

// Three.js辅助类
export class ThreeHelper {
    constructor(game) {
        console.log('ThreeHelper构造函数开始执行');
        this.game = game;
        this.canvas3d = game.canvas3d;

        // 预加载GLTFLoader
        this.preloadGLTFLoader();

        // 确保canvas尺寸正确
        if (this.canvas3d.width === 0 || this.canvas3d.height === 0) {
            // 移除强制设置的固定尺寸，使用父元素尺寸或窗口尺寸
            this.canvas3d.width = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientWidth : window.innerWidth;
            this.canvas3d.height = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientHeight : window.innerHeight;
            console.log(
                `设置canvas3d尺寸: ${this.canvas3d.width}x${this.canvas3d.height}`
            );
        }

        // 初始化Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.getConfigValue('scene.backgroundColor', 0x222222));

        // 使用透视相机，提供更真实的3D视角和透视效果
        // 计算视口参数
        this.viewSize = Math.max(this.canvas3d.height, 600); // 基于画布高度，但不小于600
        const aspectRatio = this.canvas3d.width / this.canvas3d.height;
        
        // 使用PerspectiveCamera创建相机
        this.camera = new THREE.PerspectiveCamera(
            this.getConfigValue('camera.fov', 30), // 使用配置中的FOV
            aspectRatio, // 画布宽高比
            this.getConfigValue('camera.near', 10), // 使用配置中的近裁剪面
            this.getConfigValue('camera.far', 3000) // 使用配置中的远裁剪面
        );

        // 从配置中获取相机位置
        const cameraPos = this.getConfigValue('camera.position', {
            x: 0,
            y: 1500,
            z: 1000
        });
        
        // 从配置中获取相机焦点
        const cameraLookAt = this.getConfigValue('camera.lookAt', {
            x: 0,
            y: 0,
            z: 0
        });

        // 将相机位置设置为略微向前倾斜的视角，但调整角度使游戏更易看清
        this.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
        this.camera.lookAt(cameraLookAt.x, cameraLookAt.y, cameraLookAt.z);
        
        // 设置相机阴影参数
        this.camera.updateProjectionMatrix();

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
        
        // 创建游戏边界
        this.createBoundary();

        // 添加窗口大小变化的事件监听器
        this.resizeHandler = () => {
            const newWidth = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientWidth : window.innerWidth;
            const newHeight = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientHeight : window.innerHeight;
            this.resize(newWidth, newHeight);
        };
        
        window.addEventListener('resize', this.resizeHandler);
        
        // 游戏开始时主动调用一次resize，确保与窗口调整时有相同的处理方法
        setTimeout(() => {
            this.resizeHandler();
        }, 100);
        
        // 立即开始加载纹理
        console.log('ThreeHelper构造函数完成，开始加载纹理...');
        this.loadBackgroundImages();
    }

    // 辅助方法：安全地获取配置值，如果不存在则返回默认值
    getConfigValue(path, defaultValue) {
        try {
            // 将路径拆分为部分，例如 'rendering.shadows.mapSize' => ['rendering', 'shadows', 'mapSize']
            const parts = path.split('.');
            let value = CONFIG;

            // 逐级访问对象属性
            for (const part of parts) {
                if (value === undefined || value === null || typeof value !== 'object') {
                    // 如果中间任何一级不存在，返回默认值
                    return defaultValue;
                }
                value = value[part];
            }

            // 如果最终值是undefined，返回默认值
            return value !== undefined ? value : defaultValue;
        } catch (e) {
            console.warn(`获取配置值 '${path}' 出错:`, e);
            return defaultValue;
        }
    }

    // 辅助方法：有条件地输出日志
    logDebug(message, type = 'log', condition = true) {
        if (!this.getConfigValue('debug.enabled', false) || !condition) {
            return;
        }

        const maxEntries = this.getConfigValue('debug.maxConsoleEntries', 100);
        
        // 如果日志太多，则跳过
        if (!window.debugLogCount) {
            window.debugLogCount = 0;
        }
        
        if (window.debugLogCount >= maxEntries) {
            // 每100条日志重置一次计数器，并输出一条清除消息
            if (window.debugLogCount % maxEntries === 0) {
                console.clear();
                console.log(`已清除控制台，限制日志数为 ${maxEntries} 条`);
                window.debugLogCount = 0;
            }
            return;
        }
        
        window.debugLogCount++;
        
        switch (type) {
            case 'warn':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
            default:
                console.log(message);
        }
    }

    // 创建默认3D对象
    createDefaultObjects() {
        // 此方法在新版本中不再需要，但保留空方法以兼容现有代码
        console.log('createDefaultObjects被调用 - 此方法现在是空的');
    }

    // 创建简化版地面，直接使用2D模式同样的平铺方式
    createSimpleGround() {
        console.log('创建简化版地面');

        // 获取地面尺寸配置
        const groundSize = this.getConfigValue('scene.groundSize', 9000);

        // 创建几何体 - 大尺寸以确保覆盖视野，使用配置中的尺寸
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);

        // 使用程序化生成的草地纹理代替加载图片
        const grassCanvas = generateGrassTexture(); // Get the canvas element
        const grassTexture = new THREE.CanvasTexture(grassCanvas); // Create THREE texture from canvas

        // 设置纹理平铺参数
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;

        // 从配置中获取纹理重复次数
        const groundTextureRepeat = this.getConfigValue('scene.groundTextureRepeat', 200);
        grassTexture.repeat.set(groundTextureRepeat, groundTextureRepeat);

        // 纹理过滤 - 使用NearestFilter避免边缘模糊
        grassTexture.magFilter = THREE.NearestFilter;
        grassTexture.minFilter = THREE.NearestFilter;
        grassTexture.generateMipmaps = false; // 关闭mipmap避免边缘混合
        grassTexture.needsUpdate = true;

        // 从配置获取地面材质属性
        const groundConfig = this.getConfigValue('scene.ground', {
            color: 0x668866,
            roughness: 0.8,
            metalness: 0.1,
            receiveShadow: true
        });

        // 创建材质 - 使用配置的属性
        const groundMaterial = new THREE.MeshStandardMaterial({
            map: grassTexture, // Apply the generated texture
            side: THREE.DoubleSide,
            color: groundConfig.color,
            roughness: groundConfig.roughness,
            metalness: groundConfig.metalness
        });

        // 创建地面网格
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // 旋转使平面水平
        ground.position.y = -10; // 略微下沉
        ground.receiveShadow = groundConfig.receiveShadow; // 从配置中获取是否接收阴影
        this.scene.add(ground);
        this.objects.set('ground', ground);

        // 添加暗色叠加，匹配2D模式中的深色调
        const overlayGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: 0x202040, // 更深的蓝黑色调
            transparent: true,
            opacity: 0.2,    // 增加不透明度
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.rotation.x = -Math.PI / 2;
        overlay.position.y = -9; // 略高于地面
        this.scene.add(overlay);
        this.objects.set('ground_overlay', overlay);

        console.log('地面创建完成，使用程序生成的草地纹理');
    }

    // 创建WebGL渲染器
    createRenderer() {
        try {
            // 如果已经有渲染器，先清理
            if (this.renderer) {
                this.logDebug('清理现有渲染器...', 'log', this.getConfigValue('debug.logWarnings', true));
                try {
                    this.renderer.dispose();
                    try {
                        this.renderer.forceContextLoss();
                    } catch (e) {
                        this.logDebug('强制丢失WebGL上下文失败，这是正常现象:', 'warn', this.getConfigValue('debug.logWarnings', true));
                    }
                    this.renderer = null;
                } catch (e) {
                    this.logDebug('清理渲染器时出错:', 'error', this.getConfigValue('debug.logWarnings', true));
                }
            }
            
            // 确保Canvas完全干净，不获取旧的上下文
            this.logDebug('确保Canvas干净...', 'log', this.getConfigValue('debug.logWarnings', true));

            // 调试时记录Canvas信息
            if (this.getConfigValue('debug.logSceneInfo', false)) {
                this.logDebug('Canvas 3D信息:' + JSON.stringify({
                    width: this.canvas3d.width,
                    height: this.canvas3d.height,
                    offsetWidth: this.canvas3d.offsetWidth,
                    offsetHeight: this.canvas3d.offsetHeight,
                    clientWidth: this.canvas3d.clientWidth, 
                    clientHeight: this.canvas3d.clientHeight
                }));
            }

            // 确保canvas尺寸合法
            if (this.canvas3d.width < 1 || this.canvas3d.height < 1) {
                this.logDebug('Canvas尺寸无效，使用窗口尺寸', 'warn', this.getConfigValue('debug.logWarnings', true));
                this.canvas3d.width = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientWidth : window.innerWidth;
                this.canvas3d.height = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientHeight : window.innerHeight;
            }

            // 检查WebGL支持
            if (!window.WebGLRenderingContext) {
                this.logDebug('浏览器不支持WebGL', 'error', this.getConfigValue('debug.logWarnings', true));
                return false;
            }

            // 检查WebGL2支持
            let isWebGL2 = false;
            try {
                const canWebGL2 = !!window.WebGL2RenderingContext;
                if (canWebGL2) {
                    isWebGL2 = true;
                    this.logDebug('浏览器支持WebGL2', 'log', this.getConfigValue('debug.logSceneInfo', false));
                } else {
                    this.logDebug('浏览器不支持WebGL2，将使用WebGL1', 'log', this.getConfigValue('debug.logWarnings', true));
                }
            } catch (e) {
                this.logDebug('检查WebGL2支持失败:', 'warn', this.getConfigValue('debug.logWarnings', true));
            }

            // 从配置中获取渲染器设置
            const antialias = this.getConfigValue('rendering.antialiasing', true);
            const pixelRatio = this.getConfigValue('rendering.pixelRatio', window.devicePixelRatio || 1);
            const preserveDrawingBuffer = this.getConfigValue('rendering.preserveDrawingBuffer', false);
            const powerPreference = this.getConfigValue('rendering.powerPreference', 'default');

            // 使用更安全的选项创建WebGL渲染器
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas3d,
                antialias: antialias,
                alpha: true,
                powerPreference: powerPreference,
                preserveDrawingBuffer: preserveDrawingBuffer,
                failIfMajorPerformanceCaveat: false,
                depth: true,
                stencil: false,
                logarithmicDepthBuffer: false
            });

            // 设置渲染器基本参数
            this.renderer.setSize(this.canvas3d.width, this.canvas3d.height, true); // 改为true，让渲染器自动调整CSS尺寸
            this.renderer.setPixelRatio(pixelRatio);
            
            // 设置背景色
            const backgroundColor = this.getConfigValue('scene.backgroundColor', 0x222222);
            this.renderer.setClearColor(backgroundColor, 1);

            // 设置阴影
            const enableShadows = this.getConfigValue('rendering.shadows.enabled', true);
            
            if (enableShadows) {
                if (this.renderer.capabilities && this.renderer.capabilities.isWebGL2) {
                    this.renderer.shadowMap.enabled = true;
                    
                    // 根据配置设置阴影类型
                    const shadowType = this.getConfigValue('rendering.shadows.type', 'PCFSoftShadow');
                    switch (shadowType) {
                        case 'Basic':
                            this.renderer.shadowMap.type = THREE.BasicShadowMap;
                            break;
                        case 'PCF':
                            this.renderer.shadowMap.type = THREE.PCFShadowMap;
                            break;
                        case 'PCFSoft':
                        default:
                            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                            break;
                    }
                } else if (this.renderer.capabilities) {
                    this.renderer.shadowMap.enabled = true;
                    this.renderer.shadowMap.type = THREE.BasicShadowMap;
                }
            } else {
                this.renderer.shadowMap.enabled = false;
            }

            if (this.getConfigValue('debug.logSceneInfo', false)) {
                this.logDebug('WebGL渲染器创建成功 - ' + JSON.stringify({
                    isWebGL2: this.renderer.capabilities && this.renderer.capabilities.isWebGL2,
                    maxTextures: this.renderer.capabilities && this.renderer.capabilities.maxTextures,
                    precision: this.renderer.capabilities && this.renderer.capabilities.precision,
                    antialias: antialias,
                    pixelRatio: pixelRatio,
                    shadowsEnabled: this.renderer.shadowMap.enabled,
                    shadowType: this.renderer.shadowMap.type
                }));
            }
            return true;
        } catch (error) {
            this.logDebug('创建WebGL渲染器时出错:' + error.message, 'error', this.getConfigValue('debug.logWarnings', true));

            // 尝试使用极简设置创建
            try {
                this.logDebug('尝试使用极简选项创建渲染器...', 'log', this.getConfigValue('debug.logWarnings', true));
                
                // 使用最低配置
                this.renderer = new THREE.WebGLRenderer({
                    canvas: this.canvas3d,
                    antialias: false,
                    alpha: true,
                    precision: 'lowp',
                    powerPreference: 'default',
                    preserveDrawingBuffer: false,
                    depth: true,
                    stencil: false,
                    failIfMajorPerformanceCaveat: false
                });

                this.renderer.setSize(this.canvas3d.width, this.canvas3d.height, true); // 改为true，让渲染器自动调整CSS尺寸
                this.renderer.setPixelRatio(1);
                this.renderer.setClearColor(this.getConfigValue('scene.backgroundColor', 0x222222), 1);
                
                // 关闭阴影
                this.renderer.shadowMap.enabled = false;

                this.logDebug('备用渲染器创建成功', 'log', this.getConfigValue('debug.logWarnings', true));
                return true;
            } catch (e) {
                this.logDebug('备用渲染器创建失败:' + e.message, 'error', this.getConfigValue('debug.logWarnings', true));
                
                // 通知游戏引擎3D模式不可用
                if (this.game) {
                    this.game.showWarning('3D模式不可用，将使用2D模式', 180);
                }
                return false;
            }
        }
    }

    // 清理Three.js资源
    dispose() {
        console.log('开始清理Three.js资源...');
        
        // 移除窗口大小变化的事件监听器
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        // 清理动画混合器和计时器
        if (this.mixers) {
            this.mixers.length = 0; // 清空数组
            this.mixers = null;
        }
        
        // 清理时钟
        this.clock = null;
        
        // 清理计时器 - 尤其重要的是攻击动画计时器
        const player = this.objects ? this.objects.get('player') : null;
        if (player && player.userData) {
            // 清除攻击动画计时器
            if (player.userData.attackAnimationTimer) {
                clearTimeout(player.userData.attackAnimationTimer);
                player.userData.attackAnimationTimer = null;
            }
            // 重置攻击状态
            if (player.userData.isAttacking !== undefined) {
                player.userData.isAttacking = false;
            }
        }
        
        // 首先尝试解除所有纹理的引用
        if (this.textures) {
            for (const key in this.textures) {
                if (this.textures[key]) {
                    // 在处理前确保纹理存在
                    try {
                        this.textures[key].dispose();
                        // 明确移除引用
                        this.textures[key] = null;
                    } catch (e) {
                        console.warn(`清理纹理 ${key} 失败:`, e);
                    }
                }
            }
            // 清空纹理对象
            this.textures = {};
        }

        // 清理场景中的对象及其材质和几何体
        if (this.scene) {
            try {
                // 递归遍历场景中所有对象
                const disposeNode = (node) => {
                    if (node.children) {
                        // 从后向前遍历，这样在移除子对象时不会影响索引
                        for (let i = node.children.length - 1; i >= 0; i--) {
                            disposeNode(node.children[i]);
                        }
                    }
                    
                    // 移除对象材质和几何体
                    if (node.geometry) {
                        node.geometry.dispose();
                    }
                    
                    if (node.material) {
                        if (Array.isArray(node.material)) {
                            node.material.forEach(material => {
                                disposeMaterial(material);
                            });
                        } else {
                            disposeMaterial(node.material);
                        }
                    }
                    
                    // 移除引用
                    if (node.parent) {
                        node.parent.remove(node);
                    }
                };
                
                // 处理材质及其纹理
                const disposeMaterial = (material) => {
                    // 处理材质的各种纹理和映射
                    const disposeProperty = (prop) => {
                        if (material[prop] && material[prop].isTexture) {
                            material[prop].dispose();
                            material[prop] = null;
                        }
                    };
                    
                    // 处理常见的纹理属性
                    disposeProperty('map');
                    disposeProperty('lightMap');
                    disposeProperty('bumpMap');
                    disposeProperty('normalMap');
                    disposeProperty('displacementMap');
                    disposeProperty('specularMap');
                    disposeProperty('emissiveMap');
                    disposeProperty('metalnessMap');
                    disposeProperty('roughnessMap');
                    disposeProperty('alphaMap');
                    disposeProperty('aoMap');
                    disposeProperty('envMap');
                    
                    // 处理材质本身
                    material.dispose();
                };
                
                // 处理场景中的所有对象
                while (this.scene.children.length > 0) {
                    disposeNode(this.scene.children[0]);
                }
            } catch (e) {
                console.error('清理场景对象失败:', e);
            }
            
            // 清除场景引用
            this.scene = null;
        }

        // 清理对象映射
        if (this.objects) {
            try {
                this.objects.clear();
            } catch (e) {
                console.warn('清理对象映射失败:', e);
            }
            this.objects = null;
        }

        // 清理动画相关
        this.animatedTorches = null;
        this.animatedLights = null;
        
        // 清理相机
        this.camera = null;

        // 最后清理渲染器
        if (this.renderer) {
            try {
                // 尝试使用WEBGL_lose_context扩展显式释放上下文
                const gl = this.renderer.getContext();
                if (gl) {
                    try {
                        const loseContextExt = gl.getExtension('WEBGL_lose_context');
                        if (loseContextExt) {
                            console.log('使用WEBGL_lose_context扩展释放WebGL上下文');
                            loseContextExt.loseContext();
                        } else {
                            console.warn('浏览器不支持WEBGL_lose_context扩展，这是正常现象');
                        }
                    } catch (e) {
                        console.warn('WEBGL_lose_context扩展调用失败，这是正常现象', e);
                    }
                }
                
                // 设置渲染DOM元素引用为null，帮助垃圾回收
                const renderDomElement = this.renderer.domElement;
                
                // 处理渲染器自身
                this.renderer.dispose();
                
                // 清理WebGL上下文关联的资源
                try {
                    this.renderer.forceContextLoss();
                } catch (e) {
                    console.warn('强制丢失WebGL上下文失败，这是正常现象:', e);
                }
                
                // 帮助垃圾回收器清理
                if (renderDomElement) {
                    renderDomElement.__webglFramebuffer = null;
                }
                
                // 清除引用
                this.renderer = null;
            } catch (e) {
                console.error('清理渲染器资源失败:', e);
                // 确保引用被清除，即使过程出错
                this.renderer = null;
            }
        }

        console.log('已清理Three.js资源');
        
        // 强制垃圾回收（如果支持）
        if (window.gc) {
            try {
                window.gc();
                console.log('已请求执行垃圾回收');
            } catch (e) {
                // gc可能不可用，忽略错误
            }
        }
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
        
        // 重新创建边界
        this.createBoundary();
    }

    // 创建背景对象
    createBackgroundObjects() {
        console.log('开始创建背景对象...');

        if (
            !this.game.backgroundObjects ||
            this.game.backgroundObjects.length === 0
        ) {
            console.warn('没有找到背景对象数据');
            return;
        }

        // 清除现有的背景对象
        this.objects.forEach((object, key) => {
            if (
                key.startsWith('background_') ||
                key.startsWith('torch_light_')
            ) {
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
        
        // 从配置中获取背景对象缩放
        const backgroundObjectScale = this.getConfigValue('scene.backgroundObjectScale', 3);

        // 遍历游戏中的背景对象
        this.game.backgroundObjects.forEach((obj, index) => {
            try {
                // 根据对象类型选择合适的纹理
                let texture;
                let height = 100; // 默认高度
                
                // 不要在这里再次声明scale变量

                // 根据对象类型选择纹理
                switch (obj.type) {
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
                        switch (obj.type) {
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
                            emissiveIntensity: 0.2,
                        });

                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.position.set(obj.x, height / 2, obj.y);

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
                    const geometry = new THREE.CylinderGeometry(
                        20,
                        25,
                        height,
                        8
                    );
                    const material = new THREE.MeshStandardMaterial({
                        map: texture,
                        roughness: 0.8,
                        metalness: 0.2,
                    });
                    mesh = new THREE.Mesh(geometry, material);
                    
                    // 不需要单独设置位置，会由通用逻辑处理
                } else if (obj.type === 'brokenPillar') {
                    // 创建断裂的柱子（上窄下宽的圆柱体）
                    const baseHeight = height * 0.7;  // 主体高度
                    const topHeight = height * 0.3;   // 断裂部分高度
                    
                    // 柱子主体 - 底部更宽
                    const baseGeo = new THREE.CylinderGeometry(
                        8,        // 顶部半径
                        12,       // 底部半径
                        baseHeight,
                        8,        // 分段数
                        1,
                        false,
                        0, 
                        Math.PI * 2
                    );
                    
                    // 断裂部分 - 不规则形状
                    const topGeo = new THREE.CylinderGeometry(
                        5,        // 顶部半径
                        8,        // 底部半径 (与柱子主体顶部匹配)
                        topHeight,
                        8,        // 分段数
                        1,
                        false,
                        0,
                        Math.PI * 1.7  // 不是完整的圆柱体，表示断裂
                    );
                    
                    const material = new THREE.MeshStandardMaterial({
                        map: texture,
                        roughness: 0.9,
                        metalness: 0.1,
                        color: 0xcccccc  // 灰白色石柱
                    });
                    
                    // 创建两部分网格
                    const baseMesh = new THREE.Mesh(baseGeo, material);
                    const topMesh = new THREE.Mesh(topGeo, material);
                    
                    // 定位断裂部分在主体顶部
                    topMesh.position.y = baseHeight / 2 + topHeight / 2;
                    
                    // 稍微旋转上部，增加破损感
                    topMesh.rotation.y = Math.PI / 6;
                    
                    // 添加到组
                    mesh = new THREE.Group();
                    mesh.add(baseMesh);
                    mesh.add(topMesh);
                    
                    // 不需要单独设置位置，会由通用逻辑处理
                } else if (obj.type === 'gravestone') {
                    // 创建墓碑形状（底部圆柱加上部石碑）
                    
                    // 底座 - 圆柱形
                    const baseGeo = new THREE.CylinderGeometry(
                        8,       // 顶部半径
                        10,      // 底部半径
                        height * 0.2,  // 高度
                        8        // 分段数
                    );
                    
                    // 石碑主体 - 长方体
                    const stoneGeo = new THREE.BoxGeometry(
                        16,              // 宽度
                        height * 0.7,    // 高度
                        4                // 厚度
                    );
                    
                    // 石碑顶部 - 半圆形
                    const topGeo = new THREE.CylinderGeometry(
                        8,               // 半径
                        8,               
                        4,               // 高度
                        16,              // 分段数
                        1,
                        false,
                        0,
                        Math.PI          // 半圆
                    );
                    
                    const material = new THREE.MeshStandardMaterial({
                        map: texture,
                        roughness: 0.8,
                        metalness: 0.2,
                        color: 0xaaaaaa  // 灰色石头
                    });
                    
                    // 创建部件网格
                    const baseMesh = new THREE.Mesh(baseGeo, material);
                    const stoneMesh = new THREE.Mesh(stoneGeo, material);
                    const topMesh = new THREE.Mesh(topGeo, material);
                    
                    // 定位各部分
                    baseMesh.position.y = -height * 0.3; // 底座在底部
                    stoneMesh.position.y = height * 0.15; // 主体居中
                    topMesh.position.y = height * 0.5;   // 顶部
                    topMesh.rotation.x = Math.PI / 2;    // 旋转半圆使其面向上方
                    
                    // 随机稍微倾斜整个墓碑
                    const tiltAngle = (Math.random() - 0.5) * 0.15;
                    
                    // 组合为一个组
                    mesh = new THREE.Group();
                    mesh.add(baseMesh);
                    mesh.add(stoneMesh);
                    mesh.add(topMesh);
                    
                    // 应用随机倾斜
                    mesh.rotation.z = tiltAngle;
                    
                    // 不需要单独设置位置，会由通用逻辑处理
                } else if (obj.type === 'deadTree') {
                    // 使用高细长的圆柱体和球体组合作为树
                    const trunkGeo = new THREE.CylinderGeometry(
                        5,
                        8,
                        height * 0.8,
                        6
                    );
                    const trunkMaterial = new THREE.MeshStandardMaterial({
                        color: 0x663300,
                        roughness: 0.9,
                    });
                    const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);

                    const foliageGeo = new THREE.SphereGeometry(20, 8, 6);
                    const foliageMaterial = new THREE.MeshStandardMaterial({
                        color: 0x225522,
                        roughness: 0.9,
                    });
                    const foliage = new THREE.Mesh(foliageGeo, foliageMaterial);
                    foliage.position.y = height * 0.5;

                    mesh = new THREE.Group();
                    mesh.add(trunk);
                    mesh.add(foliage);
                    
                    // 不需要单独设置位置，会由通用逻辑处理
                } else if (obj.type === 'torch') {
                    // 使用简单的几何形状组合
                    const stickGeo = new THREE.CylinderGeometry(
                        2,
                        2,
                        height,
                        6
                    );
                    const stickMaterial = new THREE.MeshStandardMaterial({
                        color: 0x663300,
                        roughness: 0.9,
                    });
                    const stick = new THREE.Mesh(stickGeo, stickMaterial);

                    // 火把头部分（布包裹部分）
                    const headGeo = new THREE.CylinderGeometry(
                        5, // 顶部半径
                        4, // 底部半径
                        height * 0.15, // 高度
                        8 // 分段数
                    );
                    const headMaterial = new THREE.MeshStandardMaterial({
                        color: 0xa52a2a, // 红褐色
                        roughness: 0.8,
                    });
                    const head = new THREE.Mesh(headGeo, headMaterial);
                    head.position.y = height * 0.45; // 放在柄的上部

                    // 火焰核心 - 更明亮的内部
                    const flameCoreGeo = new THREE.SphereGeometry(8, 12, 10);
                    const flameCoreMaterial = new THREE.MeshStandardMaterial({
                        color: 0xffff80, // 明亮的黄色
                        emissive: 0xffff80,
                        emissiveIntensity: 1.2, // 更强的发光
                        transparent: true,
                        opacity: 0.9,
                    });
                    const flameCore = new THREE.Mesh(flameCoreGeo, flameCoreMaterial);
                    flameCore.position.y = height * 0.55;
                    flameCore.scale.y = 1.2; // 稍微拉长

                    // 火焰外部 - 更大、更透明
                    const flameOuterGeo = new THREE.SphereGeometry(12, 10, 8);
                    const flameOuterMaterial = new THREE.MeshStandardMaterial({
                        color: 0xff6600, // 橙色
                        emissive: 0xff4400,
                        emissiveIntensity: 0.8,
                        transparent: true,
                        opacity: 0.6,
                    });
                    const flameOuter = new THREE.Mesh(flameOuterGeo, flameOuterMaterial);
                    flameOuter.position.y = height * 0.55;
                    flameOuter.scale.y = 1.4; // 更拉长的形状

                    // 为火焰添加随机性
                    flameOuter.rotation.x = Math.random() * 0.2;
                    flameOuter.rotation.z = Math.random() * 0.2;
                    
                    // 记录火把的动画状态
                    flameCore.userData.animationOffset = Math.random() * Math.PI * 2;
                    flameOuter.userData.animationOffset = Math.random() * Math.PI * 2;
                    
                    // 组合所有部分
                    mesh = new THREE.Group();
                    mesh.add(stick);
                    mesh.add(head);
                    mesh.add(flameCore);
                    mesh.add(flameOuter);
                    
                    // 将火把加入到需要动画的对象列表中
                    if (!this.animatedTorches) {
                        this.animatedTorches = [];
                    }
                    this.animatedTorches.push({
                        flameCore: flameCore,
                        flameOuter: flameOuter
                    });
                    
                    // 不需要单独设置位置，会由通用逻辑处理
                } else {
                    // 其他对象使用简单的Box
                    const geometry = new THREE.BoxGeometry(30, height, 30);
                    const material = new THREE.MeshStandardMaterial({
                        map: texture,
                        roughness: 0.8,
                        metalness: 0.2,
                    });
                    mesh = new THREE.Mesh(geometry, material);
                }

                // 设置位置和大小
                const objectScale = (obj.scale || 1) * backgroundObjectScale; // 将背景物体尺寸使用配置的缩放因子

                // 为对象添加随机变化以增强透视效果
                let randomScale = 1.0;
                let randomRotationY = 0;
                
                // 使用基于位置的伪随机数，确保每次加载时相同对象具有相同随机值
                const pseudoRandom = Math.abs(Math.sin(obj.x * 0.1 + obj.y * 0.2));
                
                // 对树木添加更多的随机变化
                if (obj.type === 'deadTree') {
                    // 树木高度变化范围为原高度的80%-120%
                    randomScale = 0.8 + pseudoRandom * 0.4;
                    // 树木随机旋转
                    randomRotationY = pseudoRandom * Math.PI * 2;
                } 
                // 对墓碑添加轻微随机旋转
                else if (obj.type === 'gravestone') {
                    randomRotationY = (pseudoRandom - 0.5) * 0.5; // 小角度随机倾斜
                }
                // 对断柱添加随机缩放
                else if (obj.type === 'brokenPillar') {
                    randomScale = 0.9 + pseudoRandom * 0.2;
                }

                // 如果是组合对象，直接设置位置
                if (mesh instanceof THREE.Group) {
                    // 先设置缩放，因为这会影响到包围盒的计算
                    mesh.scale.set(objectScale * randomScale, objectScale * randomScale, objectScale * randomScale);
                    mesh.rotation.y = randomRotationY;
                    
                    // 初始设置物体位置，便于计算包围盒
                    mesh.position.set(obj.x, 0, obj.y);
                    
                    // 在设置了缩放和位置后，计算包围盒以确定底部
                    // 但需要更新世界矩阵以确保包围盒正确
                    mesh.updateMatrixWorld(true);
                    
                    // 创建一个临时的包围盒来计算物体的实际高度
                    const tempBox = new THREE.Box3().setFromObject(mesh);
                    const bottomY = tempBox.min.y;  // 物体最低点的Y坐标
                    
                    // 计算需要向上抬升的距离，使物体的底部正好位于地面上
                    // 添加安全检查，避免极端情况
                    const yOffset = -bottomY;
                    
                    // 安全检查：如果偏移值过大或过小，或者是NaN，使用合理的默认值
                    let finalYOffset = yOffset;
                    if (isNaN(yOffset) || yOffset > 1000 || yOffset < -1000) {
                        console.warn(`${obj.type} 计算的Y偏移异常: ${yOffset}，使用默认值`);
                        finalYOffset = height * 0.5; // 使用一个基于高度的合理默认值
                    }
                    
                    // 设置最终位置，确保物体底部在地面上(y=0)
                    mesh.position.set(obj.x, finalYOffset, obj.y);
                    
                    // 为所有物体类型添加调试日志
                    console.log(`${obj.type} 位置调整: 原始底部Y=${bottomY.toFixed(2)}, 计算抬升=${yOffset.toFixed(2)}, 最终抬升=${finalYOffset.toFixed(2)}, 最终Y=${mesh.position.y.toFixed(2)}`);
                } else {
                    // 对于简单网格，先应用缩放
                    mesh.scale.set(objectScale * randomScale, objectScale * randomScale, objectScale * randomScale);
                    mesh.rotation.y = randomRotationY;
                    
                    // 计算包围盒
                    mesh.geometry.computeBoundingBox();
                    const box = mesh.geometry.boundingBox;
                    
                    // 计算缩放后的高度
                    const scaledHeight = (box.max.y - box.min.y) * objectScale * randomScale;
                    
                    // 计算需要的Y偏移，使物体底部位于地面
                    const bottomY = box.min.y * objectScale * randomScale;
                    const yOffset = -bottomY;
                    
                    // 安全检查：如果偏移值过大或过小，或者是NaN，使用合理的默认值
                    let finalYOffset = yOffset;
                    if (isNaN(yOffset) || yOffset > 1000 || yOffset < -1000) {
                        console.warn(`${obj.type || '默认盒子'} 计算的Y偏移异常: ${yOffset}，使用默认值`);
                        finalYOffset = scaledHeight / 2; // 使用高度一半作为默认值
                    }
                    
                    // 设置位置，使物体底部在地面上
                    mesh.position.set(obj.x, finalYOffset, obj.y);
                    
                    // 为简单网格物体添加调试日志
                    console.log(`${obj.type || '默认盒子'} (简单网格) 位置调整: 原始底部Y=${bottomY.toFixed(2)}, 计算抬升=${yOffset.toFixed(2)}, 最终抬升=${finalYOffset.toFixed(2)}, 最终Y=${mesh.position.y.toFixed(2)}`);
                }

                // 添加到场景
                this.scene.add(mesh);
                this.objects.set(`background_${index}`, mesh);
                createdCount++;

                // 为火把添加点光源
                if (obj.type === 'torch') {
                    // 通过专用方法添加火把特效
                    this.createTorchEffects(obj, index, height, objectScale);
                }
            } catch (e) {
                console.error(`创建背景对象时出错: ${e.message}`);
            }
        });

        console.log(`创建了 ${createdCount} 个背景对象`);
    }

    // 初始化玩家模型
    initPlayerModel() {
        // 创建临时玩家主体（在模型加载完成前显示）
        const tempBodyGeometry = new THREE.SphereGeometry(
            this.game.player.radius,
            16,
            16
        );
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.game.player.color,
            roughness: 0.5,
            metalness: 0.5,
        });

        const tempPlayerBody = new THREE.Mesh(tempBodyGeometry, bodyMaterial);
        tempPlayerBody.castShadow = true;

        // 创建玩家组合对象
        const playerGroup = new THREE.Group();
        playerGroup.add(tempPlayerBody);
        
        // 设置位置
        playerGroup.position.set(this.game.player.x, 0, this.game.player.y);
        
        // 添加一个碰撞点标记，显示逻辑位置
        this.addCollisionMarker(playerGroup);
        
        this.scene.add(playerGroup);
        this.objects.set('player', playerGroup);

        // 创建时钟用于动画
        this.clock = new THREE.Clock();
        
        // 初始化动画混合器数组
        this.mixers = [];

        // 加载FBX模型
        this.loadPlayerFBXModel(playerGroup);
        
        // 创建玩家状态条（血条和冷却条）
        this.createPlayerStatusBars();
    }
    
    // 添加碰撞点标记（用于调试和可视化碰撞检测点）
    addCollisionMarker(group) {
        // 创建一个小球体作为碰撞点标记
        const geometry = new THREE.SphereGeometry(5, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0 // 设置为完全透明，但仍保留代码以便需要时可以显示
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(0, 0, 0); // 放置在组的中心点
        
        // 将标记添加到组中
        group.add(marker);
        
        // 存储对标记的引用
        group.userData.collisionMarker = marker;
        
        return marker;
    }

    // 加载玩家FBX模型
    loadPlayerFBXModel(playerGroup) {
        // 动态导入FBXLoader
        import('three/examples/jsm/loaders/FBXLoader.js').then(({ FBXLoader }) => {
            // 显示加载信息
            if (this.game && this.game.showWarning) {
                this.game.showWarning('正在加载3D角色模型...', 120);
            }
            
            const loader = new FBXLoader();
            
            // 加载模型
            loader.load(
                // 模型路径
                './3dres/player.fbx',
                
                // 加载成功回调
                (fbx) => {
                    console.log('3D角色模型加载成功:', fbx);
                    
                    // 移除临时球体
                    const tempBody = playerGroup.children[0];
                    if (tempBody) {
                        playerGroup.remove(tempBody);
                    }
                    
                    // 调整模型大小和位置
                    fbx.scale.set(0.45, 0.45, 0.45); // 从0.35增加到0.45，使主角稍微大一些
                    fbx.position.y = 0; // 调整为负值，确保底部接触地面
                    
                    
                    // 为模型及其所有子对象启用阴影
                    fbx.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    // 整体抬高玩家组的位置，使模型底部接触地面，中心点在半高处
                    playerGroup.position.y = 0; // 改为0，解决悬空问题
                    
                    // 添加到玩家组
                    playerGroup.add(fbx);
                    
                    // 保存模型引用
                    playerGroup.userData.model = fbx;
                    
                    // 处理动画
                    if (fbx.animations && fbx.animations.length) {
                        // 创建动画混合器
                        const mixer = new THREE.AnimationMixer(fbx);
                        this.mixers.push(mixer);
                        
                        // 保存所有动画
                        playerGroup.userData.animations = {};
                        playerGroup.userData.mixer = mixer;
                        
                        fbx.animations.forEach(clip => {
                            const name = clip.name.toLowerCase();
                            console.log(`发现动画: ${name}`);
                            playerGroup.userData.animations[name] = mixer.clipAction(clip);
                        });
                        
                        // 播放默认的idle动画
                        this.playAnimation(playerGroup, 'idle');
                    }
                    
                    // 显示加载完成信息
                    if (this.game && this.game.showWarning) {
                        this.game.showWarning('3D角色模型加载完成', 60);
                    }
                },
                
                // 加载进度回调
                (xhr) => {
                    const percent = Math.floor((xhr.loaded / xhr.total) * 100);
                    console.log(`模型加载进度: ${percent}%`);
                    
                    // 更新加载进度信息
                    if (this.game && this.game.showWarning && percent % 10 === 0) { 
                        this.game.showWarning(`3D角色模型加载中: ${percent}%`, 30);
                    }
                },
                
                // 加载错误回调
                (error) => {
                    console.error('3D角色FBX模型加载失败:', error);
                    
                    // 显示错误信息，尝试加载GLTF模型作为备用
                    if (this.game && this.game.showWarning) {
                        this.game.showWarning('FBX模型加载失败，尝试加载GLTF模型', 180);
                    }
                    
                    // 尝试加载GLTF模型作为备用
                    this.loadPlayerGLTFModel(playerGroup);
                }
            );
        }).catch(error => {
            console.error('加载FBXLoader失败:', error);
            
            // 显示错误信息
            if (this.game && this.game.showWarning) {
                this.game.showWarning('无法加载FBXLoader，使用GLTF模型代替', 180);
            }
            
            // 使用GLTF模型作为备用
            this.loadPlayerGLTFModel(playerGroup);
        });
    }
    
    // 播放指定动画
    playAnimation(playerGroup, animName) {
        if (!playerGroup || !playerGroup.userData.animations) return;
        
        // 检查是否启用了动画日志
        const logAnimations = this.getConfigValue('debug.logAnimations', false);
        
        // 在控制台显示当前播放的动画名称和所有可用动画（仅在启用日志时）
        if (logAnimations) {
            this.logDebug(`尝试播放动画: ${animName}`);
        }
        
        // 如果是不断重复的调用，提前返回，避免刷屏
        if (playerGroup.userData.lastAnimationAttempt === animName && 
            Date.now() - (playerGroup.userData.lastAnimationAttemptTime || 0) < 1000) {
            return;
        }
        
        // 记录本次尝试
        playerGroup.userData.lastAnimationAttempt = animName;
        playerGroup.userData.lastAnimationAttemptTime = Date.now();
        
        // 只在开发模式或首次加载时输出可用动画列表
        if (logAnimations && !playerGroup.userData.animationsLogged) {
            this.logDebug('可用动画: ' + Object.keys(playerGroup.userData.animations).join(', '));
            playerGroup.userData.animationsLogged = true;
        }
        
        // 查找匹配的动画（不区分大小写）
        let foundAnimation = null;
        let foundName = null;
        
        // 精确匹配
        if (playerGroup.userData.animations[animName]) {
            foundAnimation = playerGroup.userData.animations[animName];
            foundName = animName;
        } 
        // 处理Mixamo动画特殊情况 - 大多数mixamo动画名称都包含mixamo.com
        else if (Object.keys(playerGroup.userData.animations).length === 1 && 
                 Object.keys(playerGroup.userData.animations)[0].includes('mixamo.com')) {
            // 如果只有一个动画且包含mixamo.com，直接使用它
            foundName = Object.keys(playerGroup.userData.animations)[0];
            foundAnimation = playerGroup.userData.animations[foundName];
            
            // 仅记录一次这个适配
            if (logAnimations && !playerGroup.userData.mixamoAdaptationLogged) {
                this.logDebug(`适配Mixamo动画: 将所有动画请求映射到唯一可用的动画 "${foundName}"`);
                playerGroup.userData.mixamoAdaptationLogged = true;
            }
        }
        // 其他匹配逻辑保持不变...
        else {
            // 模糊匹配代码...
        }
        
        // 如果没有找到动画，使用第一个可用的动画
        if (!foundAnimation && Object.keys(playerGroup.userData.animations).length > 0) {
            const firstAnimName = Object.keys(playerGroup.userData.animations)[0];
            foundAnimation = playerGroup.userData.animations[firstAnimName];
            foundName = firstAnimName;
            
            // 避免重复日志
            if (logAnimations && !playerGroup.userData.fallbackLogged) {
                this.logDebug(`未找到${animName}动画，使用第一个可用动画: ${firstAnimName}`);
                playerGroup.userData.fallbackLogged = true;
            }
        }
        
        // 如果没有找到任何动画，直接返回
        if (!foundAnimation) {
            if (logAnimations && !playerGroup.userData.noAnimationsLogged) {
                this.logDebug(`未找到任何可用动画`, 'warn');
                playerGroup.userData.noAnimationsLogged = true;
            }
            return;
        }
        
        // 已经播放的动画不需要重新开始
        if (playerGroup.userData.currentAnimation === foundName) {
            return;
        }
        
        // 仅在动画真正变化时输出日志
        if (logAnimations) {
            this.logDebug(`播放动画: ${foundName}`);
        }
        
        // 获取动画淡入淡出时间
        const fadeTime = this.getConfigValue('animations.fadeInTime', 0.2);
        
        // 停止当前动画
        if (playerGroup.userData.currentAnimation && 
            playerGroup.userData.animations[playerGroup.userData.currentAnimation]) {
            playerGroup.userData.animations[playerGroup.userData.currentAnimation].fadeOut(fadeTime);
        }
        
        // 播放新动画
        foundAnimation.reset().fadeIn(fadeTime).play();
        playerGroup.userData.currentAnimation = foundName;
    }
    
    // 播放攻击动画 - 中断任何当前动画并立即播放攻击动画
    playAttackAnimation() {
        const player = this.objects.get('player');
        if (!player || !player.userData.animations) return;
        
        // 找到合适的攻击动画名称
        let attackAnimName = 'attack';
        
        // 检查可用的动画列表，查找包含attack关键字的动画
        const availableAnimations = Object.keys(player.userData.animations);
        const attackAnimations = availableAnimations.filter(name => 
            name.toLowerCase().includes('attack') || 
            name.toLowerCase().includes('slash') || 
            name.toLowerCase().includes('swing')
        );
        
        if (attackAnimations.length > 0) {
            attackAnimName = attackAnimations[0];
        } else if (availableAnimations.length > 0) {
            // 如果没有找到攻击动画，使用第一个可用的动画
            attackAnimName = availableAnimations[0];
        }
        
        // 获取攻击动画速度配置
        const attackSpeed = this.getConfigValue('models.player.attackAnimationSpeed', 1.0);
        
        // 获取动画混合器
        const mixer = player.userData.mixer;
        if (!mixer) return;
        
        // 查找合适的动画动作
        let attackAction = player.userData.animations[attackAnimName];
        if (!attackAction) return;
        
        // 设置动画速度 - 从配置中读取
        attackAction.setEffectiveTimeScale(attackSpeed);
        
        // 保存当前正在播放的动画（非攻击动画）以便攻击结束后恢复
        if (player.userData.currentAnimation && player.userData.currentAnimation !== attackAnimName) {
            player.userData.lastNonAttackAnimation = player.userData.currentAnimation;
        }
        
        // 获取更短的淡入时间，使攻击动画能够更快开始
        const fadeTime = 0.1; // 使用更短的淡入时间，使动画切换更快
        
        // 立即淡出当前正在播放的动画
        if (player.userData.currentAnimation && 
            player.userData.animations[player.userData.currentAnimation]) {
            player.userData.animations[player.userData.currentAnimation].fadeOut(fadeTime);
        }
        
        // 重置并播放攻击动画
        attackAction.reset().fadeIn(fadeTime).play();
        player.userData.currentAnimation = attackAnimName;
        
        // 标记玩家正在攻击
        player.userData.isAttacking = true;
        
        // 设置一个计时器，在攻击动画播放一段时间后恢复到之前的动画
        // 根据动画速度调整实际播放时间
        const baseDuration = this.getConfigValue('models.player.attackAnimationDuration', 0.5);
        const attackDuration = (baseDuration / attackSpeed) * 1000;
        
        // 清除之前的攻击动画计时器
        if (player.userData.attackAnimationTimer) {
            clearTimeout(player.userData.attackAnimationTimer);
        }
        
        // 设置新的计时器
        player.userData.attackAnimationTimer = setTimeout(() => {
            player.userData.isAttacking = false;
            
            // 恢复到之前的动画状态
            if (player.userData.lastNonAttackAnimation) {
                const isMoving = this.game.player.isMoving();
                const animToResume = isMoving ? 'walk' : 'idle';
                this.playAnimation(player, animToResume);
            }
        }, attackDuration);
    }

    // 更新玩家动画
    updatePlayerAnimation() {
        const player = this.objects.get('player');
        if (!player || !player.userData.animations) return;
        
        // 如果正在播放攻击动画，不要打断它
        if (player.userData.isAttacking) return;
        
        // 检查玩家是否在移动
        const isMoving = this.game.player.isMoving();
        
        // 根据移动状态播放相应动画
        if (isMoving) {
            this.playAnimation(player, 'walk');
        } else {
            this.playAnimation(player, 'idle');
        }
    }

    // 更新场景中的所有对象位置
    updateSceneObjects() {
        // 1. 更新玩家位置
        if (this.game.player) {
            this.updateObjectPosition('player', this.game.player.x, this.game.player.y);
        }
        
        // 2. 更新敌人位置
        for (const enemy of this.game.enemies) {
            const key = `enemy_${enemy.id}`;
            
            // 检查敌人是否已有3D表示
            if (!this.objects.has(key)) {
                this.createEnemyModel(enemy);
            }
            
            // 更新敌人位置
            this.updateObjectPosition(key, enemy.x, enemy.y);
            
            // 更新敌人血条，确保其面向相机
            const healthBarKey = `enemy_healthbar_${enemy.id}`;
            if (this.objects.has(healthBarKey)) {
                const healthBar = this.objects.get(healthBarKey);
                if (healthBar) {
                    // 确保血条位置保持在敌人头顶
                    const enemyObj = this.objects.get(key);
                    if (enemyObj) {
                        // 获取敌人的世界坐标
                        enemyObj.updateWorldMatrix(true, false);
                        const worldPos = new THREE.Vector3();
                        enemyObj.getWorldPosition(worldPos);
                        
                        // 设置血条位置
                        const yOffset = enemy.radius * 2.5;
                        healthBar.position.set(0, yOffset, 0);
                        
                        // 更新血条比例
                        const healthPercent = enemy.health / enemy.maxHealth;
                        const healthBarFg = healthBar.children[1]; // 血条前景
                        
                        if (healthBarFg) {
                            healthBarFg.scale.x = healthPercent;
                            
                            // 调整位置，以便血条从左向右减少
                            const healthBarWidth = enemy.radius * 2;
                            const offsetX = (healthBarWidth - (healthBarWidth * healthPercent)) / 2;
                            healthBarFg.position.x = -offsetX;
                        }
                    }
                }
            }
        }
        
        // 3. 更新投射物位置
        for (const projectile of this.game.projectiles.concat(this.game.enemyProjectiles)) {
            const key = `projectile_${projectile.id}`;
            
            // 检查投射物是否已有3D表示
            if (!this.objects.has(key)) {
                this.createProjectileModel(projectile);
            }
            
            // 更新投射物位置
            const projectileObj = this.objects.get(key);
            if (projectileObj) {
                // 直接设置位置和高度
                const height = projectileObj.userData.height || 65;
                projectileObj.position.set(projectile.x, height, projectile.y);
                
                // 更新旋转，先确保模型面向运动方向
                if (projectile.shape === 'rect') {
                    // 对于矩形投射物（如真空刃），让它沿运动方向旋转
                    projectileObj.rotation.y = projectile.angle + Math.PI/2;
                } else if (projectile.rotateSpeed) {
                    // 如果投射物有自旋，更新旋转角度
                    projectileObj.rotation.y += projectile.rotateSpeed;
                } else {
                    // 其他投射物，根据运动方向旋转
                    projectileObj.rotation.y = projectile.angle;
                }
                
                // 真空刃特殊处理：如果是矩形且高度很小，添加倾斜效果增强剑气感
                if (projectile.shape === 'rect' && projectile.height < 3 && projectile.width > 20) {
                    // 轻微倾斜给人一种"剑气"的感觉
                    projectileObj.rotation.x = Math.PI * 0.1; // 稍微向上倾斜
                }
            }
        }
        
        // 4. 更新经验球位置
        for (const expOrb of this.game.expOrbs) {
            const key = `expOrb_${expOrb.id}`;
            
            // 检查经验球是否已有3D表示
            if (!this.objects.has(key)) {
                this.createExpOrbModel(expOrb);
            }
            
            // 更新经验球位置
            const orbObj = this.objects.get(key);
            if (orbObj) {
                // 获取配置中的悬浮高度
                const floatingHeight = this.getConfigValue('models.floatingHeights.expOrbs', 50);
                
                // 添加脉动效果
                const time = Date.now() * 0.001; // 转换为秒
                const pulseOffset = expOrb.id * 0.1; // 为每个经验球添加不同的偏移
                const heightOffset = Math.sin(time * 2 + pulseOffset) * 5; // 上下波动
                
                orbObj.position.set(expOrb.x, floatingHeight + heightOffset, expOrb.y);
                
                // 添加旋转
                orbObj.rotation.y += 0.03;
            }
        }
        
        // 5. 清理不再存在的对象
        this.cleanupRemovedObjects();
    }

    // 创建敌人模型
    createEnemyModel(enemy) {
        let geometry;

        // 根据不同敌人类型创建不同形状
        switch (enemy.constructor.name) {
            case 'Zombie':
                geometry = new THREE.BoxGeometry(
                    enemy.radius * 1.5, // 减小宽度，从3倍减小到1.5倍
                    enemy.radius * 3, // 减小高度，从6倍减小到3倍
                    enemy.radius * 1.5  // 减小深度，从3倍减小到1.5倍
                );
                break;
            case 'SkeletonSoldier':
                geometry = new THREE.CylinderGeometry(
                    enemy.radius * 0.8, // 减小顶部半径，从1.5倍减小到0.8倍
                    enemy.radius * 0.6, // 减小底部半径，从1.05倍减小到0.6倍
                    enemy.radius * 3, // 减小高度，从6倍减小到3倍
                    4
                );
                break;
            case 'MedusaHead':
                geometry = new THREE.OctahedronGeometry(enemy.radius * 0.8, 0); // 减小尺寸，从1.5倍减小到0.8倍
                break;
            case 'BladeSoldier':
                geometry = new THREE.BoxGeometry(
                    enemy.radius * 1.5, // 减小宽度，从3倍减小到1.5倍
                    enemy.radius * 3.5, // 减小高度，从6.75倍减小到3.5倍
                    enemy.radius * 1.5 // 减小深度，从3倍减小到1.5倍
                );
                break;
            case 'SpearGuard':
                geometry = new THREE.CylinderGeometry(
                    enemy.radius * 0.8, // 减小顶部半径，从1.5倍减小到0.8倍
                    enemy.radius * 0.6, // 减小底部半径，从1.2倍减小到0.6倍
                    enemy.radius * 3.2, // 减小高度，从6.3倍减小到3.2倍
                    5 // 五边形，更像战士
                );
                break;
            case 'FireDemon':
                geometry = new THREE.SphereGeometry(enemy.radius * 0.8, 8, 8); // 减小半径，从1.5倍减小到0.8倍
                // 稍微扁平化
                geometry.scale(1, 1.5, 1);
                break;
            default:
                geometry = new THREE.SphereGeometry(enemy.radius * 0.8, 8, 8); // 减小半径，从1.5倍减小到0.8倍
                // 稍微增高
                geometry.scale(1, 1.5, 1);
        }

        const material = new THREE.MeshStandardMaterial({
            color: enemy.color,
            roughness: 0.7,
            metalness: 0.3,
        });

        const enemyMesh = new THREE.Mesh(geometry, material);
        
        // 保存敌人类型信息和血量信息
        enemyMesh.userData.enemyType = enemy.constructor.name;
        enemyMesh.userData.enemy = enemy;
        
        // 创建敌人组，使碰撞点标记与视觉模型分离
        const enemyGroup = new THREE.Group();
        
        // 添加碰撞点标记到敌人中心
        this.addCollisionMarker(enemyGroup);
        
        // 添加模型到组
        enemyGroup.add(enemyMesh);
        
        // 根据敌人类型设置模型位置，使其底部接触地面
        if (enemy.constructor.name === 'MedusaHead') {
            // 美杜莎头保持悬空，模型置于中心点
            enemyMesh.position.y = 0;
        } else {
            // 其他敌人的模型位置调整，使它们的中间点位于逻辑位置，底部接触地面
            let modelHeight = 0;
            
            // 计算各种模型的高度
            if (enemy.constructor.name === 'Zombie') {
                modelHeight = enemy.radius * 3; // 更新为与模型高度一致
            } else if (enemy.constructor.name === 'SkeletonSoldier') {
                modelHeight = enemy.radius * 3; // 更新为与模型高度一致
            } else if (enemy.constructor.name === 'BladeSoldier') {
                modelHeight = enemy.radius * 3.5; // 更新为与模型高度一致
            } else if (enemy.constructor.name === 'SpearGuard') {
                modelHeight = enemy.radius * 3.2; // 更新为与模型高度一致
            } else if (enemy.constructor.name === 'FireDemon') {
                modelHeight = enemy.radius * 2.4; // 考虑到0.8倍半径和1.5倍y轴缩放
            } else {
                modelHeight = enemy.radius * 2.4; // 考虑到0.8倍半径和1.5倍y轴缩放
            }
            
            // 将模型向上移动半高，使其底部接触地面，中心在半高处
            enemyMesh.position.y = 0;
        }
        
        // 设置整个组的位置
        if (enemy.constructor.name === 'MedusaHead') {
            // 美杜莎头悬空
            enemyGroup.position.set(enemy.x, 80, enemy.y); // 降低悬浮高度，从150降至80
        } else {
            // 其他敌人位置设置在地面上，碰撞点标记在半高处
            const heightOffset = enemy.radius * 1.5; // 减小高度偏移，从3倍减小到1.5倍
            enemyGroup.position.set(enemy.x, heightOffset, enemy.y);
        }
        
        enemyMesh.castShadow = true;

        // 创建血条
        this.createEnemyHealthBar(enemyGroup, enemy);

        this.scene.add(enemyGroup);
        this.objects.set(`enemy_${enemy.id}`, enemyGroup);

        return enemyGroup;
    }

    // 创建敌人血条
    createEnemyHealthBar(enemyGroup, enemy) {
        // 血条宽度基于敌人半径
        const healthBarWidth = enemy.radius * 2;
        const healthBarHeight = 2;
        
        // 创建血条背景（灰色）
        const healthBarBgGeometry = new THREE.BoxGeometry(healthBarWidth, healthBarHeight, 1);
        const healthBarBgMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.7
        });
        const healthBarBg = new THREE.Mesh(healthBarBgGeometry, healthBarBgMaterial);
        
        // 获取敌人模型（组中的第一个子对象）
        const enemyMesh = enemyGroup.children.find(child => child instanceof THREE.Mesh && child !== enemyGroup.userData.collisionMarker);
        
        // 根据敌人类型确定血条高度位置
        let healthBarY = 0;
        if (enemy.constructor.name === 'MedusaHead') {
            healthBarY = enemy.radius * 1.5; // 美杜莎头头顶
        } else {
            // 计算各种模型的高度
            let modelHeight = 0;
            if (enemy.constructor.name === 'Zombie') {
                modelHeight = enemy.radius * 3; // 更新为与模型高度一致
            } else if (enemy.constructor.name === 'SkeletonSoldier') {
                modelHeight = enemy.radius * 3; // 更新为与模型高度一致
            } else if (enemy.constructor.name === 'BladeSoldier') {
                modelHeight = enemy.radius * 3.5; // 更新为与模型高度一致
            } else if (enemy.constructor.name === 'SpearGuard') {
                modelHeight = enemy.radius * 3.2; // 更新为与模型高度一致
            } else if (enemy.constructor.name === 'FireDemon') {
                modelHeight = enemy.radius * 2.4; // 考虑到0.8倍半径和1.5倍y轴缩放
            } else {
                modelHeight = enemy.radius * 2.4; // 考虑到0.8倍半径和1.5倍y轴缩放
            }
            
            // 将血条放在模型顶部
            healthBarY = modelHeight / 2 + enemy.radius * 0.3;
        }
        
        // 设置血条背景位置（放置在怪物头顶）
        healthBarBg.position.set(0, healthBarY, 0);
        
        // 创建血条前景（红色，表示当前血量）
        const healthPercent = enemy.health / enemy.maxHealth;
        const healthBarFgGeometry = new THREE.BoxGeometry(healthBarWidth * healthPercent, healthBarHeight, 1.5);
        const healthBarFgMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000
        });
        const healthBarFg = new THREE.Mesh(healthBarFgGeometry, healthBarFgMaterial);
        
        // 调整血条前景位置，使其与血条背景对齐
        const offsetX = (healthBarWidth - healthBarWidth * healthPercent) / 2;
        healthBarFg.position.set(-offsetX, healthBarY, 0);
        
        // 血条组合（背景和前景）
        const healthBarGroup = new THREE.Group();
        healthBarGroup.add(healthBarBg);
        healthBarGroup.add(healthBarFg);
        
        // 总是让血条面向相机
        healthBarGroup.rotation.x = -Math.PI / 6;
        
        // 将血条添加到敌人组上，使其跟随敌人移动
        enemyGroup.add(healthBarGroup);
        
        // 保存健康条引用到模型的userData
        enemyGroup.userData.healthBar = healthBarGroup;
    }

    // 更新敌人血条
    updateEnemyHealthBar(enemyGroup) {
        // 检查是否有健康条和敌人引用
        if (!enemyGroup || !enemyGroup.userData.healthBar || !enemyGroup.userData.enemy) {
            return;
        }
        
        const enemy = enemyGroup.userData.enemy;
        const healthBar = enemyGroup.userData.healthBar;
        
        // 计算当前血量百分比
        const healthPercent = enemy.health / enemy.maxHealth;
        
        // 获取血条前景（第二个子对象）
        const healthBarFg = healthBar.children[1];
        if (healthBarFg) {
            // 更新血条宽度
            healthBarFg.scale.x = healthPercent;
            
            // 调整位置，使血条从左到右均匀减少
            const healthBarWidth = enemy.radius * 2;
            const offsetX = (healthBarWidth - (healthBarWidth * healthPercent)) / 2;
            healthBarFg.position.x = -offsetX;
            
            // 根据血量改变颜色
            if (healthPercent > 0.5) {
                healthBarFg.material.color.setHex(0xff0000); // 红色
            } else if (healthPercent > 0.25) {
                healthBarFg.material.color.setHex(0xff5500); // 橙色
            } else {
                healthBarFg.material.color.setHex(0xff0000); // 红色（保持红色）
            }
        }
    }

    // 创建投射物模型
    createProjectileModel(projectile) {
        let geometry;
        
        // 根据形状创建不同的几何体
        switch(projectile.shape) {
            case 'sword':
                // 创建扁平的菱形几何体作为剑
                geometry = new THREE.ConeGeometry(projectile.width/2, projectile.height*1.5, 4);
                geometry.rotateX(Math.PI/2); // 旋转使其水平方向
                break;
                
            case 'axe':
                // 创建斧头形状（球体加上圆锥）
                geometry = new THREE.SphereGeometry(projectile.radius * 0.8, 8, 8);
                break;
                
            case 'rune':
                // 创建八面体作为符文
                geometry = new THREE.OctahedronGeometry(projectile.radius, 0);
                break;
                
            case 'rect':
                // 创建矩形（扁平的盒子）
                geometry = new THREE.BoxGeometry(projectile.width, projectile.height, projectile.height/2);
                break;
                
            default:
                // 默认使用球体
                geometry = new THREE.SphereGeometry(projectile.radius, 8, 8);
                break;
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: projectile.color,
            emissive: projectile.color,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.7,
        });

        const projectileMesh = new THREE.Mesh(geometry, material);
        
        // 根据投射物形状和类型设置不同的高度
        let height = 65; // 默认高度与玩家中心点一致，从50提高到65
        
        // 如果是剑、斧等武器，调低一些
        if (projectile.shape === 'sword' || projectile.shape === 'axe' || projectile.shape === 'rune') {
            height = 55; // 从40提高到55
        }
        // 如果是魔法效果，可以适当提高
        else if (projectile.type === 'holy' || projectile.type === 'magic') {
            height = 75; // 从60提高到75
        }
        // 如果是矩形的，可能是剑气，略高于玩家中心
        else if (projectile.shape === 'rect') {
            height = 60; // 从45提高到60
        }
        
        projectileMesh.position.set(projectile.x, height, projectile.y);
        
        // 如果投射物有旋转速度，设置初始旋转角度
        if (projectile.rotation) {
            projectileMesh.rotation.z = projectile.rotation;
        }
        
        // 保存旋转速度到userData，以便动画更新
        if (projectile.rotateSpeed) {
            projectileMesh.userData.rotateSpeed = projectile.rotateSpeed;
        }
        
        // 添加阴影
        projectileMesh.castShadow = true;
        projectileMesh.receiveShadow = true;

        // 保存高度信息到userData，以便updateObjectPosition使用
        projectileMesh.userData.height = height;

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
            metalness: 0.7,
        });

        const orbMesh = new THREE.Mesh(geometry, material);
        // 将高度从5提高到50，更贴近玩家模型高度但略低一些
        orbMesh.position.set(expOrb.x, 50, expOrb.y);
        
        // 添加阴影
        orbMesh.castShadow = true;
        orbMesh.receiveShadow = true;

        this.scene.add(orbMesh);
        this.objects.set(`expOrb_${expOrb.id}`, orbMesh);

        return orbMesh;
    }

    // 更新对象位置
    updateObjectPosition(key, x, y, z = 0) {
        const object = this.objects.get(key);
        if (object) {
            if (key === 'player') {
                // 特殊处理玩家对象：保持垂直高度不变，只更新水平位置
                const currentY = object.position.y || 0; // 保存当前的y值，如果未设置则使用0
                object.position.set(x, currentY, y); // 设置新位置，保持y值不变
                
                // 如果有碰撞点标记，确保它位于中心点
                if (object.userData.collisionMarker) {
                    // 保持位置在玩家中心点
                    object.userData.collisionMarker.position.set(0, 0, 0);
                }
            } else if (key.startsWith('enemy_')) {
                // 根据敌人类型设置不同的高度
                const enemyType = object.userData.enemyType;
                
                if (enemyType === 'MedusaHead') {
                    // 美杜莎头保持悬空
                    object.position.set(x, 80, y); // 降低悬浮高度，从150降至80
                } else {
                    // 其他敌人位置设置为地面上，碰撞点在半高处
                    const heightOffset = object.userData.enemy ? object.userData.enemy.radius * 1.5 : 25; // 减小高度偏移
                    object.position.set(x, heightOffset, y);
                }
                
                // 确保碰撞点标记位于中心
                if (object.userData.collisionMarker) {
                    object.userData.collisionMarker.position.set(0, 0, 0);
                }
            } else {
                // 其他对象正常更新
                object.position.set(x, z, y); // 注意：Three.js中y是上方，我们使用z作为y
            }
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

        // 获取玩家位置
        const targetX = player.position.x;
        const targetZ = player.position.z;
        
        // 获取配置中的相机参数
        const cameraHeight = this.getConfigValue('camera.position.y', 1500);
        const cameraZOffset = this.getConfigValue('camera.position.z', 1000) - this.getConfigValue('camera.lookAt.z', 0);
        const enableSmoothFollow = this.getConfigValue('camera.enableSmoothFollow', false);
        const followSpeed = this.getConfigValue('camera.followSpeed', 0.1);
        
        if (enableSmoothFollow) {
            // 应用平滑跟随，通过线性插值实现
            this.camera.position.x += (targetX - this.camera.position.x) * followSpeed;
            this.camera.position.z += ((targetZ + cameraZOffset) - this.camera.position.z) * followSpeed;
        } else {
            // 直接设置相机位置，没有平滑过渡
            this.camera.position.x = targetX;
            this.camera.position.z = targetZ + cameraZOffset;
        }
        
        // 保持固定高度
        this.camera.position.y = cameraHeight;
        
        // 始终让相机看向玩家位置的Y=0平面，保持垂直俯视感
        this.camera.lookAt(targetX, this.getConfigValue('camera.lookAt.y', 0), targetZ);
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
        // 如果未正确初始化，不执行渲染
        if (!this.scene || !this.camera || !this.renderer) {
            this.logDebug('3D场景未完全初始化，渲染已跳过', 'warn', this.getConfigValue('debug.logWarnings', true));
            return false;
        }

        const renderStartTime = performance.now();
        
        // 清除上次请求的帧动画，避免重复渲染
        if (this._renderId) {
            cancelAnimationFrame(this._renderId);
            this._renderId = null;
        }
        
        // 确保渲染器上下文存在
        if (!this.renderer.getContext()) {
            this.logDebug('渲染器上下文丢失，尝试恢复...', 'warn', this.getConfigValue('debug.logWarnings', true));
            try {
                this.recreateRenderer();
            } catch (e) {
                this.logDebug('渲染器恢复失败:' + e.message, 'error', this.getConfigValue('debug.logWarnings', true));
                return false;
            }
        }

        try {
            // 更新动画混合器
            if (this.mixers && this.mixers.length > 0) {
                const delta = this.clock.getDelta();
                for (const mixer of this.mixers) {
                    mixer.update(delta);
                }
            }
            
            // 更新场景中的对象位置
            this.updateSceneObjects();
            
            // 更新场景中的动画对象 (根据性能配置决定是否跳过某些更新)
            this.animateObjects();
            
            // 更新玩家面朝方向
            this.updatePlayerDirection();
            
            // 更新玩家状态条（血条和技能冷却条）
            this.updatePlayerStatusBars();
            
            // 更新敌人血条方向，使其面向相机
            this.updateEnemyHealthBarDirection();

            // 更新相机位置
            this.updateCamera();

            // 执行渲染
            this.renderer.render(this.scene, this.camera);
            
            // 记录渲染耗时
            const renderTime = performance.now() - renderStartTime;
            
            // 应用性能监控 - 检测性能问题
            this.monitorPerformance(renderTime);
            
            // 重置渲染错误计数
            this.renderErrorCount = 0;
            this.renderFailCount = 0;
            this.rendererRecreateAttempts = 0;
            
            return true;
        } catch (e) {
            this.logDebug(`3D渲染失败: ${e.message}`, 'error', this.getConfigValue('debug.logWarnings', true));
            this.renderErrorCount = (this.renderErrorCount || 0) + 1;
            this.renderFailCount = (this.renderFailCount || 0) + 1;
            
            // 如果连续多次渲染失败，尝试重建渲染器
            if (this.renderFailCount > 5) {
                if (this.rendererRecreateAttempts < 2) {
                    this.logDebug('尝试重建渲染器...', 'warn', this.getConfigValue('debug.logWarnings', true));
                    try {
                        this.recreateRenderer();
                        this.rendererRecreateAttempts++;
                    } catch (recreateError) {
                        this.logDebug('重建渲染器失败:' + recreateError.message, 'error', this.getConfigValue('debug.logWarnings', true));
                    }
                } else {
                    this.logDebug('多次重建渲染器失败，建议切换至2D模式', 'error', this.getConfigValue('debug.logWarnings', true));
                    
                    // 在游戏中显示错误提示
                    if (this.game) {
                        this.game.showWarning('3D渲染器异常，请使用G键切换到2D模式', 300);
                    }
                }
            }
            
            return false;
        }
    }

    // 性能监控方法
    monitorPerformance(renderTime) {
        // 显示FPS
        if (this.getConfigValue('debug.showFPS', false)) {
            const fps = Math.round(1000 / renderTime);
            if (!this._fpsUpdateTime || Date.now() - this._fpsUpdateTime > 500) {
                this.logDebug(`FPS: ${fps} (渲染耗时: ${renderTime.toFixed(2)}ms)`);
                this._fpsUpdateTime = Date.now();
            }
        }
        
        // 帧率计数 - 记录帧率进行动态调整
        if (!this._fpsHistory) {
            this._fpsHistory = [];
        }
        
        // 计算当前帧率并记录
        const currentFps = Math.round(1000 / renderTime);
        this._fpsHistory.push(currentFps);
        
        // 保持历史记录在一定长度内
        if (this._fpsHistory.length > 30) {
            this._fpsHistory.shift();
        }
        
        // 计算平均帧率
        const avgFps = this._fpsHistory.reduce((sum, fps) => sum + fps, 0) / this._fpsHistory.length;
        
        // 检测性能问题的阈值
        const performanceThreshold = this.getConfigValue('rendering.performance.lagThreshold', 100);
        const targetFps = this.getConfigValue('rendering.maxFPS', 60);
        
        // 连续低帧率检测
        if (avgFps < targetFps * 0.8) { // 如果平均帧率低于目标帧率的80%
            this.slowRenderCount = (this.slowRenderCount || 0) + 1;
            
            // 如果持续出现慢渲染，尝试降低渲染质量
            if (this.slowRenderCount > 5) {
                this.logDebug(`3D渲染性能较差，平均帧率: ${avgFps.toFixed(1)}，目标帧率: ${targetFps}`, 'warn', this.getConfigValue('debug.logWarnings', true));
                
                // 检查是否应该在性能不佳时禁用阴影
                if (this.getConfigValue('rendering.performance.disableShadowsWhenLagging', true) && 
                    this.renderer.shadowMap.enabled) {
                    
                    this.logDebug('由于性能问题，暂时禁用阴影渲染', 'warn', this.getConfigValue('debug.logWarnings', true));
                    this.renderer.shadowMap.enabled = false;
                    
                    // 显示提示消息
                    if (this.game && this.slowRenderCount === 6) {
                        this.game.showWarning('已禁用阴影以提高性能', 120);
                    }
                }
                
                // 如果性能持续不佳，尝试降低像素比
                if (this.slowRenderCount > 10) {
                    const currentPixelRatio = this.renderer.getPixelRatio();
                    // 更激进地降低像素比，目标是0.75倍
                    const newPixelRatio = Math.max(0.75, currentPixelRatio * 0.85);
                    
                    if (currentPixelRatio > newPixelRatio) {
                        this.logDebug(`由于性能问题，降低渲染像素比: ${currentPixelRatio.toFixed(2)} -> ${newPixelRatio.toFixed(2)}`, 'warn', this.getConfigValue('debug.logWarnings', true));
                        this.renderer.setPixelRatio(newPixelRatio);
                        
                        // 重新设置尺寸以应用新的像素比
                        const width = this.canvas3d.clientWidth;
                        const height = this.canvas3d.clientHeight;
                        this.renderer.setSize(width, height, true);
                        
                        // 显示提示消息
                        if (this.game) {
                            this.game.showWarning('已降低渲染质量以提高性能', 180);
                        }
                        
                        // 重置slowRenderCount，给新设置一段适应时间
                        this.slowRenderCount = 0;
                        this._fpsHistory = []; // 重置帧率历史
                    }
                }
            }
        } else {
            // 如果不再有性能问题，可以考虑恢复某些设置
            if (this.slowRenderCount > 0) {
                this.slowRenderCount--;
                
                // 如果性能已经很好，考虑重新启用之前禁用的功能
                if (this.slowRenderCount === 0 && avgFps > targetFps * 0.95) {
                    // 如果配置要求启用阴影但当前被禁用了，考虑恢复
                    const shouldEnableShadows = this.getConfigValue('rendering.shadows.enabled', true);
                    if (shouldEnableShadows && !this.renderer.shadowMap.enabled) {
                        this.logDebug('性能已恢复，重新启用阴影渲染', 'log', this.getConfigValue('debug.logWarnings', true));
                        this.renderer.shadowMap.enabled = true;
                        
                        // 根据配置设置阴影类型
                        const shadowType = this.getConfigValue('rendering.shadows.type', 'PCFSoftShadow');
                        switch (shadowType) {
                            case 'Basic':
                                this.renderer.shadowMap.type = THREE.BasicShadowMap;
                                break;
                            case 'PCF':
                                this.renderer.shadowMap.type = THREE.PCFShadowMap;
                                break;
                            case 'PCFSoft':
                            default:
                                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                                break;
                        }
                    }
                }
            }
        }
    }

    // 动画更新
    animateObjects() {
        // 记录当前帧
        if (!this.frameCount) {
            this.frameCount = 0;
        }
        this.frameCount++;
        
        // 更新中心标记，使其旋转
        const centerMarker = this.objects.get('center_marker');
        if (centerMarker) {
            centerMarker.rotation.y += 0.01;
        }

        // 更新火把动画
        if (this.animatedTorches && this.animatedTorches.length > 0) {
            // 获取火把动画更新间隔
            const torchFlamesInterval = this.getConfigValue('animations.updateIntervals.torchFlames', 2);
            // 检查当前帧是否应该更新火把动画
            if (this.frameCount % torchFlamesInterval === 0) {
                const flickerSpeed = this.getConfigValue('lighting.torch.flickerSpeed', 0.01);
                const time = Date.now() * flickerSpeed;
                const animateAll = this.getConfigValue('lighting.torch.animateAll', true);
                
                // 添加诊断日志，每秒输出一次
                if (this.frameCount % 60 === 0) {
                    console.log(`火把动画更新：火把数量=${this.animatedTorches.length}, 更新间隔=${torchFlamesInterval}, 闪烁速度=${flickerSpeed}`);
                }
                
                // 获取当前相机位置，用于距离计算
                const cameraPosition = this.camera ? this.camera.position : { x: 0, y: 0, z: 0 };
                const animationDistance = this.getConfigValue('rendering.performance.animationDistance', 800);
                
                for (const torch of this.animatedTorches) {
                    if (torch.flameCore && torch.flameOuter) {
                        // 始终动画所有火把
                        let shouldAnimate = true;
                        
                        // 只有在不强制动画所有火把时才检查距离
                        if (!animateAll && torch.flameCore.parent) {
                            // 计算火把与相机的距离
                            torch.flameCore.parent.updateWorldMatrix(true, false);
                            const worldPosition = new THREE.Vector3();
                            torch.flameCore.parent.getWorldPosition(worldPosition);
                            
                            const distToCamera = Math.sqrt(
                                Math.pow(worldPosition.x - cameraPosition.x, 2) + 
                                Math.pow(worldPosition.z - cameraPosition.z, 2)
                            );
                            
                            shouldAnimate = distToCamera < animationDistance;
                        }
                        
                        if (shouldAnimate) {
                            // 获取闪烁强度
                            const flickerIntensity = this.getConfigValue('lighting.torch.flickerIntensity', 0.5);
                            
                            // 将火焰材质设为发光效果增强
                            torch.flameCore.material.emissive = new THREE.Color(0xffcc00);
                            torch.flameCore.material.emissiveIntensity = 1.0 + 0.5 * Math.sin(time + torch.flameCore.userData.animationOffset);
                            
                            torch.flameOuter.material.emissive = new THREE.Color(0xff5500);
                            torch.flameOuter.material.emissiveIntensity = 0.8 + 0.3 * Math.sin(time * 0.8 + torch.flameOuter.userData.animationOffset);
                            
                            // 火焰核心的脉动效果 - 增加基础大小和变化幅度
                            const coreScale = 1.0 + flickerIntensity * Math.sin(time + torch.flameCore.userData.animationOffset);
                            torch.flameCore.scale.x = coreScale;
                            torch.flameCore.scale.z = coreScale;
                            
                            // 火焰外部的摇曳效果 - 更大的变化幅度
                            const outerScaleX = 1.0 + flickerIntensity * 1.2 * Math.sin(time * 0.7 + torch.flameOuter.userData.animationOffset);
                            const outerScaleZ = 1.0 + flickerIntensity * 1.5 * Math.sin(time * 0.8 + torch.flameOuter.userData.animationOffset + 1.0);
                            torch.flameOuter.scale.x = outerScaleX;
                            torch.flameOuter.scale.z = outerScaleZ;
                            
                            // 火焰的随机旋转 - 增加旋转角度
                            torch.flameOuter.rotation.x = 0.15 * Math.sin(time * 0.5 + torch.flameOuter.userData.animationOffset);
                            torch.flameOuter.rotation.z = 0.15 * Math.sin(time * 0.6 + torch.flameOuter.userData.animationOffset + 2.0);
                            
                            // 增加Y轴缩放，使火焰上下摇曳
                            torch.flameCore.scale.y = 1.0 + 0.3 * Math.sin(time * 1.2 + torch.flameCore.userData.animationOffset + 0.5);
                            torch.flameOuter.scale.y = 1.0 + 0.4 * Math.sin(time * 0.9 + torch.flameOuter.userData.animationOffset + 1.5);
                        }
                    }
                }
            }
        }
        
        // 更新火把光源动画
        if (this.animatedLights && this.animatedLights.length > 0) {
            // 获取光源动画更新间隔
            const torchLightsInterval = this.getConfigValue('animations.updateIntervals.torchLights', 3);
            const torchUpdateInterval = this.getConfigValue('lighting.torch.updateInterval', 3);
            
            // 使用配置中的更新间隔，如果有更具体的torch.updateInterval优先使用
            const updateInterval = torchUpdateInterval || torchLightsInterval;
            
            // 检查当前帧是否应该更新光源动画
            if (this.frameCount % updateInterval === 0) {
                const time = Date.now() * this.getConfigValue('lighting.torch.flickerSpeed', 0.003);
                const flickerIntensity = this.getConfigValue('lighting.torch.flickerIntensity', 0.3);
                
                // 获取相机位置和动画距离阈值
                const cameraPosition = this.camera ? this.camera.position : { x: 0, y: 0, z: 0 };
                const animationDistance = this.getConfigValue('rendering.performance.animationDistance', 800);
                
                for (const light of this.animatedLights) {
                    if (light.userData && light.userData.baseIntensity) {
                        // 计算光源与相机的距离
                        const distToCamera = Math.sqrt(
                            Math.pow(light.position.x - cameraPosition.x, 2) + 
                            Math.pow(light.position.z - cameraPosition.z, 2)
                        );
                        
                        // 仅更新与相机较近的光源
                        if (distToCamera < animationDistance) {
                            // 光照强度的闪烁效果
                            const intensityFactor = 0.85 + flickerIntensity * Math.sin(time * 1.5 + light.userData.animationOffset);
                            light.intensity = light.userData.baseIntensity * intensityFactor;
                            
                            // 添加光照颜色的微小变化，模拟火焰颜色变化
                            const hue = 0.05 + 0.02 * Math.sin(time * 0.8 + light.userData.animationOffset);
                            const saturation = 0.9 + 0.1 * Math.sin(time * 0.7 + light.userData.animationOffset + 1.0);
                            const lightness = 0.5 + 0.1 * Math.sin(time * 0.9 + light.userData.animationOffset + 2.0);
                            
                            // 使用HSL颜色模型创建火焰颜色
                            light.color.setHSL(hue, saturation, lightness);
                        }
                    }
                }
            }
        }

        // 更新其他动画对象
        const floatingObjectsInterval = this.getConfigValue('animations.updateIntervals.floatingObjects', 2);
        if (this.frameCount % floatingObjectsInterval === 0) {
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
    }

    // 调整渲染器大小
    resize(width, height) {
        if (!this.renderer) return;

        // 如果未提供尺寸，使用窗口尺寸
        if (!width || !height) {
            width = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientWidth : window.innerWidth;
            height = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientHeight : window.innerHeight;
        }

        // 确保宽高比例正确
        const aspectRatio = width / height;
        
        // 更新相机宽高比
        this.camera.aspect = aspectRatio;
        this.camera.updateProjectionMatrix();

        console.log(`调整渲染器尺寸: ${width}x${height}`);
        this.canvas3d.width = width;
        this.canvas3d.height = height;
        this.renderer.setSize(width, height, true); // 添加true参数使其更新CSS样式
    }

    // 创建灯光
    createLights() {
        // 环境光 - 根据配置设置强度
        const ambientEnabled = this.getConfigValue('lighting.ambient.enabled', true);
        const ambientColor = this.getConfigValue('lighting.ambient.color', 0xffffff);
        const ambientIntensity = this.getConfigValue('lighting.ambient.intensity', 0.7);
        
        const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
        if (ambientEnabled) {
            this.scene.add(ambientLight);
        }

        // 主方向光 - 从高处斜射，模拟太阳光
        const directionalEnabled = this.getConfigValue('lighting.directional.enabled', true);
        const directionalColor = this.getConfigValue('lighting.directional.color', 0xffffff);
        const directionalIntensity = this.getConfigValue('lighting.directional.intensity', 1.2);
        
        // 从配置获取位置，如果未设置使用默认值
        const directionalPosition = this.getConfigValue('lighting.directional.position', { x: 800, y: 1200, z: 800 });
        const directionalTarget = this.getConfigValue('lighting.directional.target', { x: 0, y: -100, z: 0 });
        
        const directionalLight = new THREE.DirectionalLight(directionalColor, directionalIntensity);
        // 设置光源位置
        directionalLight.position.set(
            directionalPosition.x, 
            directionalPosition.y, 
            directionalPosition.z
        );
        
        // 设置目标点，使光源方向固定在世界坐标系中
        directionalLight.target.position.set(
            directionalTarget.x,
            directionalTarget.y,
            directionalTarget.z
        );
        
        // 必须将target添加到场景中才能生效
        this.scene.add(directionalLight.target); 
        
        // 配置阴影
        const shadowsEnabled = this.getConfigValue('rendering.shadows.enabled', true);
        const directionalCastShadow = this.getConfigValue('lighting.directional.castShadow', true);
        directionalLight.castShadow = shadowsEnabled && directionalCastShadow;

        if (directionalLight.castShadow) {
            // 从配置获取阴影相机参数
            const shadowCamera = this.getConfigValue('rendering.shadows.camera', {
                near: 1,
                far: 3000,
                left: -1000,
                right: 1000,
                top: 1000,
                bottom: -1000
            });
            
            // 调整阴影相机参数
            directionalLight.shadow.camera.near = shadowCamera.near;
            directionalLight.shadow.camera.far = shadowCamera.far;
            directionalLight.shadow.camera.left = shadowCamera.left;
            directionalLight.shadow.camera.right = shadowCamera.right;
            directionalLight.shadow.camera.top = shadowCamera.top;
            directionalLight.shadow.camera.bottom = shadowCamera.bottom;
            
            // 从配置获取阴影贴图尺寸
            const shadowMapSize = this.getConfigValue('rendering.shadows.mapSize', 2048);
            directionalLight.shadow.mapSize.width = shadowMapSize;
            directionalLight.shadow.mapSize.height = shadowMapSize;
            
            // 从配置获取阴影偏差值
            directionalLight.shadow.bias = this.getConfigValue('rendering.shadows.bias', -0.0002);
            directionalLight.shadow.normalBias = this.getConfigValue('rendering.shadows.normalBias', 0.01);
            
            // 从配置获取阴影模糊半径
            directionalLight.shadow.radius = this.getConfigValue('rendering.shadows.radius', 2);
            
            // 添加调试日志
            if (this.getConfigValue('debug.logSceneInfo', false)) {
                this.logDebug(`阴影配置: 贴图尺寸=${shadowMapSize}, 模糊半径=${directionalLight.shadow.radius}`);
            }
        }
        
        if (directionalEnabled) {
            this.scene.add(directionalLight);
        }

        // 添加辅助照明 - 半球光
        const hemisphereEnabled = this.getConfigValue('lighting.hemisphere.enabled', true);
        const hemisphereSkyColor = this.getConfigValue('lighting.hemisphere.skyColor', 0xffffbb);
        const hemisphereGroundColor = this.getConfigValue('lighting.hemisphere.groundColor', 0x080820);
        const hemisphereIntensity = this.getConfigValue('lighting.hemisphere.intensity', 0.4);
        
        const hemisphereLight = new THREE.HemisphereLight(
            hemisphereSkyColor,
            hemisphereGroundColor,
            hemisphereIntensity
        );
        
        if (hemisphereEnabled) {
            this.scene.add(hemisphereLight);
        }

        // 添加补充光源 - 填充光
        const fillEnabled = this.getConfigValue('lighting.fill.enabled', true);
        const fillColor = this.getConfigValue('lighting.fill.color', 0xffffff);
        const fillIntensity = this.getConfigValue('lighting.fill.intensity', 0.3);
        const fillPosition = this.getConfigValue('lighting.fill.position', { x: -600, y: 400, z: -600 });
        const fillTarget = this.getConfigValue('lighting.fill.target', { x: 200, y: -50, z: 200 });
        
        const fillLight = new THREE.DirectionalLight(fillColor, fillIntensity);
        fillLight.position.set(fillPosition.x, fillPosition.y, fillPosition.z);
        fillLight.target.position.set(fillTarget.x, fillTarget.y, fillTarget.z);
        this.scene.add(fillLight.target);
        
        // 根据配置决定是否产生阴影
        fillLight.castShadow = this.getConfigValue('lighting.fill.castShadow', false) && shadowsEnabled;
        
        if (fillEnabled) {
            this.scene.add(fillLight);
        }

        // 添加额外的辅助照明 - 背面光源
        const backEnabled = this.getConfigValue('lighting.back.enabled', true);
        const backColor = this.getConfigValue('lighting.back.color', 0xffffff);
        const backIntensity = this.getConfigValue('lighting.back.intensity', 0.3);
        const backPosition = this.getConfigValue('lighting.back.position', { x: 0, y: 200, z: -600 });
        const backTarget = this.getConfigValue('lighting.back.target', { x: 0, y: -50, z: 200 });
        
        const backLight = new THREE.DirectionalLight(backColor, backIntensity);
        backLight.position.set(backPosition.x, backPosition.y, backPosition.z);
        backLight.target.position.set(backTarget.x, backTarget.y, backTarget.z);
        this.scene.add(backLight.target);
        
        // 根据配置决定是否产生阴影
        backLight.castShadow = this.getConfigValue('lighting.back.castShadow', false) && shadowsEnabled;
        
        if (backEnabled) {
            this.scene.add(backLight);
        }

        // 记录主光源
        this.mainLight = directionalLight;
        
        // 记录已创建的光源总数，用于性能监控
        this.lightCount = 0;
        if (ambientEnabled) this.lightCount++;
        if (directionalEnabled) this.lightCount++;
        if (hemisphereEnabled) this.lightCount++;
        if (fillEnabled) this.lightCount++;
        if (backEnabled) this.lightCount++;
        
        if (this.getConfigValue('debug.logSceneInfo', false)) {
            this.logDebug(`已创建 ${this.lightCount} 个基础光源`);
        }
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
            'https://via.placeholder.com/512x512/00ff00/ffffff?text=Grass', // 外部图像，确保纹理加载器工作
        ];

        console.log('测试路径列表:', testPaths);

        // 依次尝试每个路径
        const testNext = (index) => {
            if (index >= testPaths.length) {
                console.log('所有路径测试完成');
                return;
            }

            const path = testPaths[index];
            console.log(`测试路径 [${index + 1}/${testPaths.length}]: ${path}`);

            try {
                textureLoader.load(
                    path,
                    (texture) => {
                        console.log(`✅ 纹理加载成功: ${path}`);
                        console.log(
                            `  - 尺寸: ${texture.image.width}x${texture.image.height}`
                        );
                        console.log(
                            `  - 类型: ${texture.image.src.endsWith('.png') ? 'PNG' : texture.image.src.endsWith('.jpg') ? 'JPG' : '未知'}`
                        );

                        // 保存成功加载的纹理
                        this.successTexture = texture;

                        // 测试下一个路径
                        testNext(index + 1);
                    },
                    (progress) => {
                        if (progress.lengthComputable) {
                            console.log(
                                `  加载进度: ${Math.round((progress.loaded / progress.total) * 100)}%`
                            );
                        }
                    },
                    (error) => {
                        console.error(`❌ 纹理加载失败: ${path}`);
                        console.error(
                            `  错误信息: ${error.message || '未知错误'}`
                        );

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

        // 地面尺寸为2000x2000，但3D模式下放大了3倍，为6000x6000
        // 对于128x128像素的草地纹理
        if (isGrass) {
            // 对于grass_texture.png (128x128)，1个纹理单元在现实世界中应该大概为1-2米
            // 在游戏中，假设角色直径约为30单位，约1.5米
            // 因此1米约等于20游戏单位
            // 所以一个草地纹理的理想尺寸应为20-40游戏单位
            // 3D模式下物体放大了3倍，所以纹理密度保持不变需要更多的重复次数

            // 地面尺寸为6000，希望每个纹理单元在30-40单位左右
            // 重复次数应为: 6000 / 30 ≈ 200次
            const repeatX = 200; // 放大3倍后的重复次数
            const repeatY = 200;

            console.log(`草地纹理使用固定重复次数: ${repeatX}x${repeatY}`);
            return { x: repeatX, y: repeatY };
        }

        // 对于其他纹理，使用动态计算
        // 地面尺寸/纹理尺寸*0.5=纹理应该重复的次数
        // 3D模式下物体放大了3倍，地面尺寸变为6000
        const repeatX = (6000 / textureWidth) * 0.5;
        const repeatY = (6000 / textureHeight) * 0.5;

        console.log(
            `计算得到的重复次数: ${repeatX.toFixed(2)}x${repeatY.toFixed(2)}`
        );
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
        ['ground', 'debug_ground'].forEach((key) => {
            const existingGround = this.objects.get(key);
            if (existingGround) {
                this.scene.remove(existingGround);
                this.objects.delete(key);
            }
        });

        // 创建新的地面几何体，放大3倍
        const groundGeometry = new THREE.PlaneGeometry(6000, 6000);

        // 计算基于纹理实际尺寸的合适重复次数
        const { x: baseRepeatX, y: baseRepeatY } = this.calculateTextureRepeat(
            this.successTexture,
            true
        );
        
        // 放大3倍的重复次数
        const repeatX = baseRepeatX * 3;
        const repeatY = baseRepeatY * 3;

        // 配置纹理
        this.successTexture.wrapS = THREE.RepeatWrapping;
        this.successTexture.wrapT = THREE.RepeatWrapping;
        this.successTexture.repeat.set(repeatX, repeatY);
        this.successTexture.needsUpdate = true;

        // 创建材质 - 使用StandardMaterial支持阴影
        const groundMaterial = new THREE.MeshStandardMaterial({
            map: this.successTexture,
            side: THREE.DoubleSide,
            color: 0x668866, // 添加绿色调
            roughness: 0.8,  // 添加粗糙度
            metalness: 0.1   // 添加金属感
        });

        // 创建地面
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -10;
        ground.receiveShadow = true; // 启用阴影接收
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
        if (
            this.game.backgroundObjects &&
            this.game.backgroundObjects.length > 0
        ) {
            // 简单加载背景图像
            this.loadBackgroundImages();
        }
    }

    // 加载背景对象图像
    loadBackgroundImages(sync = false) {
        // 使用简单的方法加载背景对象图像
        const textureLoader = new THREE.TextureLoader();

        // 创建纹理对象存储结构
        this.textures = this.textures || {};

        // 加载背景对象所需的图像 - 修复路径问题
        const imagesToLoad = [
            { key: 'castleTower', path: '/images/castle_tower.png' },
            { key: 'brokenPillar', path: '/images/broken_pillar.png' },
            { key: 'gravestone', path: '/images/gravestone.png' },
            { key: 'deadTree', path: '/images/dead_tree.png' },
            { key: 'torch', path: '/images/torch.png' },
        ];

        // 如果是同步模式，使用Promise.all确保所有纹理加载完成
        if (sync) {
            // 创建加载Promise数组
            const loadPromises = imagesToLoad.map(img => {
                return new Promise((resolve) => {
                    // 定义多个可能的路径
                    const possiblePaths = [
                        img.path,                         // /xxx.png
                        '.' + img.path,                   // ./xxx.png
                        img.path.substring(1),            // xxx.png
                        window.location.origin + img.path  // 完整URL
                    ];
                    
                    // 尝试加载每个路径，直到成功
                    const tryLoadSync = (pathIndex = 0) => {
                        if (pathIndex >= possiblePaths.length) {
                            // 所有路径都尝试过了，尝试生成纹理
                            try {
                                let texture = null;
                                switch (img.key) {
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
                                
                                if (texture) {
                                    this.textures[img.key] = texture;
                                }
                            } catch (e) {
                                console.error(`无法生成备用纹理: ${img.key}`, e);
                            }
                            
                            // 无论成功与否，都视为已处理
                            resolve();
                            return;
                        }
                        
                        const currentPath = possiblePaths[pathIndex];
                        
                        textureLoader.load(
                            currentPath,
                            (texture) => {
                                this.textures[img.key] = texture;
                                resolve();
                            },
                            undefined,
                            (error) => {
                                // 尝试下一个路径
                                tryLoadSync(pathIndex + 1);
                            }
                        );
                    };
                    
                    // 开始第一次尝试
                    tryLoadSync();
                });
            });
            
            // 等待所有纹理加载完成，然后创建背景对象
            Promise.all(loadPromises).then(() => {
                this.createBackgroundObjects();
            });
            
            return;
        }
        
        // 异步模式 - 原有代码保持不变
        // 开始加载图像
        let loadedCount = 0;
        imagesToLoad.forEach((img) => {
            // 使用不同的备用路径尝试加载
            const tryLoad = (pathIndex = 0) => {
                // 定义多个可能的路径，首先尝试以/开头的路径（适用于生产环境）
                const possiblePaths = [
                    img.path,                         // /xxx.png
                    '.' + img.path,                   // ./xxx.png
                    img.path.substring(1),            // xxx.png
                    window.location.origin + img.path  // 完整URL
                ];
                
                if (pathIndex >= possiblePaths.length) {
                    // 所有路径都尝试过了，仍然失败
                    loadedCount++;
                    
                    // 尝试生成纹理
                    try {
                        let texture = null;
                        switch (img.key) {
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
                        
                        if (texture) {
                            this.textures[img.key] = texture;
                        }
                    } catch (e) {
                        console.error(`无法生成备用纹理: ${img.key}`, e);
                    }
                    
                    // 检查是否所有图像处理完毕
                    if (loadedCount === imagesToLoad.length) {
                        this.createBackgroundObjects();
                    }
                    return;
                }
                
                const currentPath = possiblePaths[pathIndex];
                
                textureLoader.load(
                    currentPath,
                    (texture) => {
                        this.textures[img.key] = texture;
                        loadedCount++;

                        // 所有图像加载完成后创建背景对象
                        if (loadedCount === imagesToLoad.length) {
                            this.createBackgroundObjects();
                        }
                    },
                    undefined,
                    (error) => {
                        // 尝试下一个路径
                        tryLoad(pathIndex + 1);
                    }
                );
            };
            
            // 开始第一次尝试
            tryLoad();
        });
    }

    // 创建玩家冲刺特效
    createDashEffect(x, y, radius, color) {
        // 创建冲刺特效（扁平圆盘）
        const effectGeometry = new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 2, 16);
        const effectMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.6,
            emissive: new THREE.Color(color),
            emissiveIntensity: 0.5,
        });

        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.set(x, 1, y); // 略高于地面
        effect.rotation.x = Math.PI / 2; // 使圆盘水平放置
        
        // 添加到场景
        this.scene.add(effect);
        
        // 创建动画衰减
        const duration = 20; // 匹配2D效果的持续时间
        let frame = 0;
        
        const animate = () => {
            frame++;
            
            if (frame < duration) {
                // 缩放特效
                const scale = 1 + frame * 0.05;
                effect.scale.set(scale, 1, scale);
                
                // 降低不透明度
                effect.material.opacity = 0.6 * (1 - frame / duration);
                
                requestAnimationFrame(animate);
            } else {
                // 动画结束，移除特效
                this.scene.remove(effect);
                effect.geometry.dispose();
                effect.material.dispose();
            }
        };
        
        animate();
    }
    
    // 创建残影特效
    createAfterImageEffect(x, y, radius, color) {
        // 创建残影特效（扁平球体）
        const effectGeometry = new THREE.SphereGeometry(radius, 16, 8);
        const effectMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.4,
            emissive: new THREE.Color(color),
            emissiveIntensity: 0.3,
        });

        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.set(x, 0, y);
        effect.scale.set(1, 0.2, 1); // 使其扁平
        
        // 添加到场景
        this.scene.add(effect);
        
        // 创建动画衰减
        const duration = 15; // 匹配2D效果的持续时间
        let frame = 0;
        
        const animate = () => {
            frame++;
            
            if (frame < duration) {
                // 降低不透明度
                effect.material.opacity = 0.4 * (1 - frame / duration);
                
                requestAnimationFrame(animate);
            } else {
                // 动画结束，移除特效
                this.scene.remove(effect);
                effect.geometry.dispose();
                effect.material.dispose();
            }
        };
        
        animate();
    }
    
    // 创建和更新玩家血条和冷却条
    createPlayerStatusBars() {
        // 删除已存在的状态条
        this.objects.forEach((object, key) => {
            if (key.startsWith('player_health_bar') || key.startsWith('player_dash_bar')) {
                this.scene.remove(object);
                this.objects.delete(key);
            }
        });
        
        const player = this.objects.get('player');
        if (!player) return;
        
        // 创建血条容器
        const healthBarWidth = this.game.player.radius * 2;
        const healthBarHeight = 2;
        const healthBarGeometry = new THREE.BoxGeometry(healthBarWidth, healthBarHeight, 1);
        const healthBarBgMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.7
        });
        
        // 背景血条
        const healthBarBg = new THREE.Mesh(healthBarGeometry, healthBarBgMaterial);
        healthBarBg.position.set(0, 65, 0); // 提高位置，从50提高到65
        
        // 前景血条（实际血量）
        const healthBarFgGeometry = new THREE.BoxGeometry(healthBarWidth, healthBarHeight, 1.5);
        const healthBarFgMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00
        });
        const healthBarFg = new THREE.Mesh(healthBarFgGeometry, healthBarFgMaterial);
        
        // 计算血条宽度和位置
        const healthPercent = this.game.player.health / this.game.player.maxHealth;
        const healthBarFgWidth = healthBarWidth * healthPercent;
        const offsetX = (healthBarWidth - healthBarFgWidth) / 2;
        
        // 设置前景血条尺寸和位置
        healthBarFg.scale.x = healthPercent;
        healthBarFg.position.set(-offsetX, 65, 0); // 提高位置，从50提高到65
        
        // 创建血条组
        const healthBarGroup = new THREE.Group();
        healthBarGroup.add(healthBarBg);
        healthBarGroup.add(healthBarFg);
        
        // 让血条始终面向相机
        healthBarGroup.rotation.x = -Math.PI / 6;
        
        // 把血条添加为玩家的子对象，使其跟随玩家移动
        player.add(healthBarGroup);
        this.objects.set('player_health_bar', healthBarGroup);
        
        // 创建冲刺冷却条
        // 无论是否处于冷却状态都创建冷却条对象
        // 如果当前没有冷却，则显示满格
        const dashBarWidth = this.game.player.radius * 1.5;
        const dashBarHeight = 1;
        
        // 冷却条背景
        const dashBarGeometry = new THREE.BoxGeometry(dashBarWidth, dashBarHeight, 1);
        const dashBarBgMaterial = new THREE.MeshBasicMaterial({
            color: 0x777777,
            transparent: true,
            opacity: 0.7
        });
        const dashBarBg = new THREE.Mesh(dashBarGeometry, dashBarBgMaterial);
        dashBarBg.position.set(0, 58, 0); // 提高位置，从45提高到58
        
        // 计算冷却比例
        const dashCooldownPercent = this.game.player.dashCooldown > 0 
            ? 1 - (this.game.player.dashCooldown / this.game.player.maxDashCooldown)
            : 1.0; // 无冷却时显示满格
        
        // 冷却条前景
        const dashBarFgGeometry = new THREE.BoxGeometry(dashBarWidth * dashCooldownPercent, dashBarHeight, 1.5);
        const dashBarFgMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff
        });
        
        const dashBarFg = new THREE.Mesh(dashBarFgGeometry, dashBarFgMaterial);
        const dashOffsetX = (dashBarWidth - (dashBarWidth * dashCooldownPercent)) / 2;
        dashBarFg.position.set(-dashOffsetX, 58, 0); // 提高位置，从45提高到58
        
        // 添加冲刺冷却条到场景
        const dashBarGroup = new THREE.Group();
        dashBarGroup.add(dashBarBg);
        dashBarGroup.add(dashBarFg);
        
        // 让冷却条始终面向相机
        dashBarGroup.rotation.x = -Math.PI / 6;
        
        // 让冷却条只在冷却时可见
        if (this.game.player.dashCooldown <= 0) {
            dashBarGroup.visible = false;
        }
        
        // 把冲刺冷却条添加为玩家的子对象，使其跟随玩家移动
        player.add(dashBarGroup);
        this.objects.set('player_dash_bar', dashBarGroup);
    }
    
    // 更新玩家状态条
    updatePlayerStatusBars() {
        const player = this.objects.get('player');
        if (!player) return;
        
        // 更新血条
        const healthBar = this.objects.get('player_health_bar');
        if (healthBar) {
            const healthPercent = this.game.player.health / this.game.player.maxHealth;
            const healthBarFg = healthBar.children[1]; // 前景血条是第二个子对象
            
            // 更新血条宽度
            healthBarFg.scale.x = healthPercent;
            
            // 根据血量改变颜色
            if (healthPercent > 0.5) {
                healthBarFg.material.color.setHex(0x00ff00); // 绿色
            } else if (healthPercent > 0.25) {
                healthBarFg.material.color.setHex(0xffff00); // 黄色
            } else {
                healthBarFg.material.color.setHex(0xff0000); // 红色
            }
            
            // 调整位置，以便血条从左向右减少
            const healthBarWidth = this.game.player.radius * 2;
            const offsetX = (healthBarWidth - (healthBarWidth * healthPercent)) / 2;
            healthBarFg.position.x = -offsetX;
            
            // 确保血条始终面向相机
            healthBar.quaternion.copy(this.camera.quaternion);
        } else {
            // 如果血条不存在，创建新的
            this.createPlayerStatusBars();
            return; // 已经创建了所有状态条，不需要继续执行
        }
        
        // 更新冲刺冷却条
        const dashBar = this.objects.get('player_dash_bar');
        if (dashBar) {
            // 冷却结束但条仍存在，隐藏它
            if (this.game.player.dashCooldown <= 0) {
                dashBar.visible = false;
            } else {
                // 有冷却时显示并更新
                dashBar.visible = true;
                const dashCooldownPercent = 1 - (this.game.player.dashCooldown / this.game.player.maxDashCooldown);
                const dashBarFg = dashBar.children[1]; // 前景是第二个子对象
                
                // 更新冷却条宽度
                dashBarFg.scale.x = dashCooldownPercent;
                
                // 调整位置
                const dashBarWidth = this.game.player.radius * 1.5;
                const dashOffsetX = (dashBarWidth - (dashBarWidth * dashCooldownPercent)) / 2;
                dashBarFg.position.x = -dashOffsetX;
                
                // 确保冷却条始终面向相机
                dashBar.quaternion.copy(this.camera.quaternion);
            }
        } else {
            // 如果冲刺冷却条不存在，创建所有状态条
            this.createPlayerStatusBars();
        }
    }

    // 生成城堡塔楼纹理
    generateCastleTowerTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.fillStyle = '#777777';  // 石头灰色
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加石头纹理
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 3 + Math.random() * 5;
            ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${100 + Math.random() * 50}, ${100 + Math.random() * 50}, 0.5)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 添加窗口
        const windowCount = 5;
        const windowWidth = 12;
        const windowHeight = 20;
        const spacing = canvas.height / (windowCount + 1);
        
        for (let i = 1; i <= windowCount; i++) {
            const y = i * spacing;
            
            // 在左右两侧添加窗口
            ctx.fillStyle = '#443322';
            ctx.fillRect(20, y - windowHeight/2, windowWidth, windowHeight);
            ctx.fillRect(canvas.width - 20 - windowWidth, y - windowHeight/2, windowWidth, windowHeight);
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    // 生成断裂石柱纹理
    generateBrokenPillarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.fillStyle = '#aaaaaa';  // 浅灰色
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加大理石纹理
        for (let i = 0; i < 10; i++) {
            const startX = Math.random() * canvas.width;
            const startY = 0;
            const endX = Math.random() * canvas.width;
            const endY = canvas.height;
            
            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(0.5, 'rgba(190, 190, 190, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // 添加断裂线
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, 30);
        ctx.lineTo(canvas.width - 10, 40);
        ctx.stroke();
        
        return new THREE.CanvasTexture(canvas);
    }
    
    // 生成墓碑纹理
    generateGravestoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.fillStyle = '#888888';  // 灰色
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加石头纹理
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 1 + Math.random() * 2;
            ctx.fillStyle = `rgba(${80 + Math.random() * 40}, ${80 + Math.random() * 40}, ${80 + Math.random() * 40}, 0.3)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 添加文字效果
        ctx.fillStyle = '#555555';
        ctx.fillRect(10, 20, canvas.width - 20, 40);
        
        // 模拟文字行
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(15, 30 + i * 8);
            ctx.lineTo(canvas.width - 15, 30 + i * 8);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    // 生成枯树纹理
    generateDeadTreeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // 清空画布 - 透明背景
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 画树干
        ctx.fillStyle = '#663300';
        ctx.fillRect(canvas.width/2 - 5, canvas.height/2, 10, canvas.height/2);
        
        // 画枝干
        ctx.strokeStyle = '#663300';
        ctx.lineWidth = 3;
        
        const drawBranch = (x, y, length, angle, width) => {
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x, y);
            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length;
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // 递归绘制分支
            if (width > 1) {
                drawBranch(endX, endY, length * 0.7, angle + Math.random() * 0.5, width * 0.7);
                drawBranch(endX, endY, length * 0.7, angle - Math.random() * 0.5, width * 0.7);
            }
        };
        
        // 画几个主干分支
        drawBranch(canvas.width/2, canvas.height/2, canvas.height/4, -Math.PI/4, 3);
        drawBranch(canvas.width/2, canvas.height/2, canvas.height/4, -Math.PI/2, 3);
        drawBranch(canvas.width/2, canvas.height/2, canvas.height/4, -3 * Math.PI/4, 3);
        
        return new THREE.CanvasTexture(canvas);
    }
    
    // 生成火把纹理
    generateTorchTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 画火把手柄
        ctx.fillStyle = '#8B4513';  // 棕色
        ctx.fillRect(canvas.width/2 - 2, canvas.height/2, 4, canvas.height/2 - 5);
        
        // 画火把头部
        ctx.fillStyle = '#A0522D';  // 红棕色
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2 - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 画火焰
        const flameGradient = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2 - 8,
            2,
            canvas.width/2, canvas.height/2 - 8,
            12
        );
        flameGradient.addColorStop(0, 'rgba(255, 255, 0, 0.9)');
        flameGradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.8)');
        flameGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2 - 8, 12, 0, Math.PI * 2);
        ctx.fill();
        
        return new THREE.CanvasTexture(canvas);
    }

    // 初始化核心组件和资源
    initialize() {
        console.log('开始初始化Three.js场景...');
        this.createDefaultObjects();
        this.createLights();
        this.createBackgroundObjects();
        
        // 调整相机视角以增强3D透视效果
        // 当相机初始设置完成后，微调偏移角度以获得更好的透视效果
        const cameraPos = this.getConfigValue('camera.position', {
            x: 0,
            y: 1500,
            z: 1000
        });
        const cameraLookAt = this.getConfigValue('camera.lookAt', {
            x: 0,
            y: 0,
            z: 0
        });
        
        this.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
        this.camera.lookAt(cameraLookAt.x, cameraLookAt.y, cameraLookAt.z);
        this.camera.updateProjectionMatrix();
        
        console.log('Three.js场景初始化完成');
    }

    // 创建游戏边界
    createBoundary() {
        // 此方法保留
        // 获取与2D模式相同的边界大小
        const boundary = 1000;
        
        // 创建边界材质 - 半透明红色
        const material = new THREE.LineBasicMaterial({
            color: 0xff0000, // 更鲜艳的红色
            transparent: true,
            opacity: 0.7,
        });
        
        // 创建虚线材质
        const dashMaterial = new THREE.LineDashedMaterial({
            color: 0xff0000, // 更鲜艳的红色
            dashSize: 10,
            gapSize: 10,
            transparent: true,
            opacity: 0.7, // 增加不透明度
            linewidth: 3 // 增加线宽
        });
        
        // 创建边界几何体 - 一个矩形
        const geometry = new THREE.BufferGeometry();
        const points = [
            new THREE.Vector3(-boundary, 0, -boundary),
            new THREE.Vector3(boundary, 0, -boundary),
            new THREE.Vector3(boundary, 0, boundary),
            new THREE.Vector3(-boundary, 0, boundary),
            new THREE.Vector3(-boundary, 0, -boundary) // 闭合矩形
        ];
        geometry.setFromPoints(points);
        
        // 创建边界线
        const line = new THREE.Line(geometry, dashMaterial);
        line.computeLineDistances(); // 需要计算线条距离以显示虚线效果
        line.position.y = 1; // 略高于地面
        
        this.scene.add(line);
        this.objects.set('boundary', line);
        
        return line;
    }

    // 预加载GLTFLoader
    preloadGLTFLoader() {
        console.log('预加载GLTFLoader...');
        this.gltfLoaderPromise = import('three/examples/jsm/loaders/GLTFLoader.js')
            .then(module => {
                console.log('GLTFLoader加载成功');
                this.GLTFLoader = module.GLTFLoader;
                return module.GLTFLoader;
            })
            .catch(error => {
                console.error('GLTFLoader加载失败:', error);
                return null;
            });
    }

    // 加载玩家GLTF模型作为备用
    loadPlayerGLTFModel(playerGroup) {
        // 动态导入GLTFLoader
        import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
            // 显示加载信息
            if (this.game && this.game.showWarning) {
                this.game.showWarning('正在加载备用3D角色模型...', 120);
            }
            
            const loader = new GLTFLoader();
            
            // 加载模型
            loader.load(
                // 模型路径 - 使用相对路径
                './3dres/girl1/scene.gltf',
                
                // 加载成功回调
                (gltf) => {
                    console.log('备用3D角色模型加载成功:', gltf);
                    
                    // 移除临时球体
                    const tempBody = playerGroup.children[0];
                    if (tempBody) {
                        playerGroup.remove(tempBody);
                    }
                    
                    // 获取模型
                    const model = gltf.scene;
                    
                    // 调整模型大小和位置
                    model.scale.set(115, 115, 115); // 从90增加到115，使主角稍微大一些
                    model.position.y = 0; // 调整为负值，确保底部接触地面
                    
                    // 为模型及其所有子对象启用阴影
                    model.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    // 整体抬高玩家组的位置，使模型底部接触地面，中心点在半高处
                    playerGroup.position.y = 0; // 改为0，解决悬空问题
                    
                    // 添加到玩家组
                    playerGroup.add(model);
                    
                    // 保存模型引用，以便以后更新
                    playerGroup.userData.model = model;
                    
                    // 显示加载完成信息
                    if (this.game && this.game.showWarning) {
                        this.game.showWarning('备用3D角色模型加载完成', 60);
                    }
                },
                
                // 加载进度回调
                (xhr) => {
                    const percent = Math.floor((xhr.loaded / xhr.total) * 100);
                    console.log(`备用模型加载进度: ${percent}%`);
                    
                    // 更新加载进度信息
                    if (this.game && this.game.showWarning && percent % 10 === 0) { // 每10%更新一次
                        this.game.showWarning(`备用3D角色模型加载中: ${percent}%`, 30);
                    }
                },
                
                // 加载错误回调
                (error) => {
                    console.error('备用3D角色模型加载失败:', error);
                    
                    // 显示错误信息
                    if (this.game && this.game.showWarning) {
                        this.game.showWarning('所有3D角色模型加载失败，使用默认形状', 180);
                    }
                }
            );
        }).catch(error => {
            console.error('加载GLTFLoader失败:', error);
            
            // 显示错误信息
            if (this.game && this.game.showWarning) {
                this.game.showWarning('无法加载3D模型组件，使用默认模型', 180);
            }
        });
    }

    // 更新所有敌人血条的方向，使其始终面向相机
    updateEnemyHealthBarDirection() {
        // 为每个敌人的血条设置正确的方向，使其面向相机
        this.objects.forEach((object, key) => {
            if (key.startsWith('enemy_') && object.userData.healthBar) {
                // 将血条的朝向设为始终面向相机，使用quaternion确保更准确的朝向
                object.userData.healthBar.quaternion.copy(this.camera.quaternion);
                
                // 如果有碰撞点标记，保持它一直可见
                if (object.userData.collisionMarker) {
                    object.userData.collisionMarker.quaternion.copy(this.camera.quaternion);
                }
            }
        });
    }

    // 更新玩家面朝方向
    updatePlayerDirection() {
        const player = this.objects.get('player');
        if (!player) return;
        
        const facingDirection = this.game.player.facingDirection;
        
        // 如果有模型，调整其旋转
        const model = player.userData.model;
        if (model) {
            if (facingDirection === 'right') {
                model.rotation.y = Math.PI/2;
            } else if (facingDirection === 'left') {
                model.rotation.y = -Math.PI/2;
            } else if (facingDirection === 'up') {
                // 上下移动时不改变旋转方向
                // model.rotation.y = -Math.PI;
            } else if (facingDirection === 'down') {
                // 上下移动时不改变旋转方向
                // model.rotation.y = 0;
            }
            return;
        }
        
        // 如果没有模型，使用旧的眼睛逻辑（备用方案）
        const rightEye = player.userData.rightEye;
        const leftEye = player.userData.leftEye;
        
        if (rightEye && leftEye) {
            const offset = player.userData.eyeOffset || 0;
            
            if (facingDirection === 'right') {
                rightEye.position.set(offset, 0, 0);
                leftEye.position.set(-offset, 0, 0);
            } else if (facingDirection === 'left') {
                rightEye.position.set(-offset, 0, 0);
                leftEye.position.set(offset, 0, 0);
            }
        }
    }

    // 清理已经不存在的对象
    cleanupRemovedObjects() {
        try {
            // 创建一个要删除的键的列表（避免在迭代时修改集合）
            const keysToRemove = [];
            
            this.objects.forEach((object, key) => {
                // 跳过背景对象、玩家和静态场景对象
                if (key.startsWith('background_') || 
                    key === 'player' || 
                    key === 'ground' || 
                    key === 'boundary' ||
                    key === 'center_marker' ||
                    key === 'player_health_bar' ||
                    key === 'player_dash_bar') {
                    return;
                }
                
                // 清理敌人对象
                if (key.startsWith('enemy_') && !key.includes('healthbar')) {
                    const id = key.replace('enemy_', '');
                    if (!this.game.enemies.some(e => e.id.toString() === id)) {
                        keysToRemove.push(key);
                        
                        // 同时移除相关的血条
                        keysToRemove.push(`enemy_healthbar_${id}`);
                    }
                }
                // 清理敌人血条（单独处理以防有漏网之鱼）
                else if (key.startsWith('enemy_healthbar_')) {
                    const id = key.replace('enemy_healthbar_', '');
                    if (!this.game.enemies.some(e => e.id.toString() === id)) {
                        keysToRemove.push(key);
                    }
                }
                // 清理投射物
                else if (key.startsWith('projectile_')) {
                    const id = key.replace('projectile_', '');
                    const stillExists = this.game.projectiles.some(p => p.id.toString() === id) || 
                                      this.game.enemyProjectiles.some(p => p.id.toString() === id);
                    
                    if (!stillExists) {
                        keysToRemove.push(key);
                    }
                }
                // 清理经验球
                else if (key.startsWith('expOrb_')) {
                    const id = key.replace('expOrb_', '');
                    if (!this.game.expOrbs.some(o => o.id.toString() === id)) {
                        keysToRemove.push(key);
                    }
                }
            });
            
            // 执行清理
            for (const key of keysToRemove) {
                this.removeObject(key);
            }
            
            if (keysToRemove.length > 0 && this.getConfigValue('debug.logSceneInfo', false)) {
                this.logDebug(`已清理 ${keysToRemove.length} 个不再存在的3D对象`);
            }
        } catch (e) {
            console.warn('清理对象时出错:', e);
        }
    }

    // 创建火把特效 - 光源和火焰
    createTorchEffects(obj, index, height, objectScale) {
        // 检查是否启用火把光照
        const maxTorches = this.getConfigValue('lighting.torch.maxTorches', 10);
        const torchEnabled = this.getConfigValue('lighting.torch.enabled', true);
        
        // 获取当前活动的火把光源数量
        const activeTorchLights = Array.from(this.objects.keys())
            .filter(key => key.startsWith('torch_light_'))
            .length;
        
        // 如果没有达到上限且配置允许，添加光源
        if (torchEnabled && activeTorchLights < maxTorches) {
            // 从配置中获取火把光设置
            const torchColor = this.getConfigValue('lighting.torch.color', 0xff7700);
            const torchIntensity = this.getConfigValue('lighting.torch.intensity', 3);
            const torchDistance = this.getConfigValue('lighting.torch.distance', 150) * 3; // 光照范围也放大3倍
            const torchCastShadows = this.getConfigValue('lighting.torch.castShadows', false);
            const attenuationFactor = this.getConfigValue('lighting.torch.attenuationFactor', 2.0);
            
            // 创建点光源
            const pointLight = new THREE.PointLight(torchColor, torchIntensity, torchDistance);
            pointLight.position.set(obj.x, height * objectScale * 0.6, obj.y); // 调整光源高度位于火焰位置
            
            // 设置光照衰减因子
            pointLight.decay = attenuationFactor;
            
            // 设置是否产生阴影
            pointLight.castShadow = torchCastShadows && this.getConfigValue('rendering.shadows.enabled', true);
            
            // 如果开启了阴影，设置阴影参数
            if (pointLight.castShadow) {
                // 设置阴影贴图大小
                const shadowMapSize = Math.min(512, this.getConfigValue('rendering.shadows.mapSize', 1024));
                pointLight.shadow.mapSize.width = shadowMapSize;
                pointLight.shadow.mapSize.height = shadowMapSize;
                
                // 设置阴影相机参数
                pointLight.shadow.camera.near = 10;
                pointLight.shadow.camera.far = torchDistance;
                
                // 设置阴影偏差
                pointLight.shadow.bias = -0.002;
                
                if (this.getConfigValue('debug.logSceneInfo', false)) {
                    this.logDebug(`火把光源启用阴影: 贴图尺寸=${shadowMapSize}`);
                }
            }
            
            this.scene.add(pointLight);
            this.objects.set(`torch_light_${index}`, pointLight);
            
            // 添加光照闪烁动画
            if (!this.animatedLights) {
                this.animatedLights = [];
            }
            
            // 记录光源的基本信息
            pointLight.userData = {
                baseIntensity: torchIntensity,
                animationOffset: Math.random() * Math.PI * 2,
                lastUpdateTime: 0  // 用于控制更新频率
            };
            
            this.animatedLights.push(pointLight);
            
            if (this.getConfigValue('debug.logSceneInfo', false)) {
                this.logDebug(`添加火把光源 #${activeTorchLights + 1}/${maxTorches} 位置(${obj.x},${obj.y})`);
            }
        } else if (torchEnabled && this.getConfigValue('debug.logWarnings', true) && activeTorchLights === maxTorches) {
            // 只在第一次达到上限时输出警告
            this.logDebug(`已达到最大火把光源数量 (${maxTorches})，不再添加新光源`, 'warn');
        }
        
        // 添加火焰效果 - 如果没有禁用动画
        if (this.getConfigValue('lighting.torch.animateAll', false) || 
            this.getConfigValue('animations.updateIntervals.torchFlames', 15) > 0) {
            
            // 创建火焰效果 - 一个核心和一个外层
            // 火焰核心 - 更亮更黄的部分
            const flameCoreMaterial = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                transparent: true,
                opacity: 0.8,
                emissive: 0xffcc00,
                emissiveIntensity: 1.0
            });
            const flameCoreGeometry = new THREE.SphereGeometry(4 * objectScale, 8, 8);
            const flameCore = new THREE.Mesh(flameCoreGeometry, flameCoreMaterial);
            flameCore.position.set(obj.x, height * objectScale * 0.6, obj.y);
            flameCore.userData.animationOffset = Math.random() * Math.PI * 2;
            
            // 火焰外层 - 较暗的橙色部分
            const flameOuterMaterial = new THREE.MeshBasicMaterial({
                color: 0xff5500,
                transparent: true,
                opacity: 0.7,
                emissive: 0xff5500,
                emissiveIntensity: 0.8
            });
            const flameOuterGeometry = new THREE.SphereGeometry(7 * objectScale, 8, 8);
            const flameOuter = new THREE.Mesh(flameOuterGeometry, flameOuterMaterial);
            flameOuter.position.set(obj.x, height * objectScale * 0.6, obj.y);
            flameOuter.userData.animationOffset = Math.random() * Math.PI * 2;
            
            // 添加到场景
            this.scene.add(flameCore);
            this.scene.add(flameOuter);
            
            // 将火焰添加到动画列表
            if (!this.animatedTorches) {
                this.animatedTorches = [];
            }
            
            this.animatedTorches.push({
                flameCore: flameCore,
                flameOuter: flameOuter,
                position: { x: obj.x, y: obj.y }
            });
            
            // 设置对象引用，方便后续清理
            this.objects.set(`torch_flame_core_${index}`, flameCore);
            this.objects.set(`torch_flame_outer_${index}`, flameOuter);
            
            // 添加诊断日志
            console.log(`已创建火把火焰 #${this.animatedTorches.length} 位置(${obj.x},${obj.y})`);
        }
    }

    // 创建背景对象 - 例如城堡塔楼、墓碑等
    createBackgroundObject(obj, index, scale, createdCount) {
        if (!this.scene) return;
        
        try {
            // 获取物体类型和高度
            const type = obj.type || 'pillar';
            const objectScale = this.getConfigValue('scene.backgroundObjectScale', 3) * scale;
            
            // 根据类型选择不同的几何体和高度
            let geometry;
            let height = 30;  // 默认高度
            let depth = 5;  // 默认深度
            let texture = null;
            
            // 根据对象类型选择纹理
            switch (type) {
                case 'castleTower':
                    texture = this.textures.castleTower;
                    height = 50;
                    break;
                case 'brokenPillar':
                    texture = this.textures.brokenPillar;
                    height = 30;
                    break;
                case 'gravestone':
                    texture = this.textures.gravestone;
                    height = 15;
                    break;
                case 'deadTree':
                    texture = this.textures.deadTree;
                    height = 40;
                    break;
                case 'torch':
                    texture = this.textures.torch;
                    height = 10;
                    break;
                default:
                    texture = this.textures.brokenPillar;
                    height = 30;
                    break;
            }
            
            // 检查是否以精灵形式渲染火把
            const renderTorchAsSprite = this.getConfigValue('lighting.torch.renderAsSprite', true);
            
            // 如果是火把且使用精灵渲染模式
            if (type === 'torch' && renderTorchAsSprite && texture) {
                // 创建精灵材质
                const spriteMaterial = new THREE.SpriteMaterial({ 
                    map: texture,
                    color: 0xffffff,
                    transparent: true,
                    alphaTest: 0.3
                });
                
                // 创建精灵对象
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.position.set(obj.x, height * objectScale * 0.5, obj.y);
                sprite.scale.set(30 * objectScale, 60 * objectScale, 1);
                
                // 添加到场景
                this.scene.add(sprite);
                this.objects.set(`background_${index}`, sprite);
                createdCount++;
                
                // 为火把添加点光源和火焰效果
                this.createTorchEffects(obj, index, height, objectScale);
                
                return;
            }
            
            // 创建物体几何体 - 根据对象类型选择不同形状
            switch (type) {
                case 'castleTower':
                    // 创建塔楼（圆柱形）
                    geometry = new THREE.CylinderGeometry(
                        10 * objectScale,  // 顶部半径
                        15 * objectScale,  // 底部半径
                        height * objectScale,  // 高度
                        8  // 分段数
                    );
                    break;
                
                case 'brokenPillar':
                    // 创建断柱（圆柱形，顶部较小）
                    geometry = new THREE.CylinderGeometry(
                        5 * objectScale,  // 顶部半径
                        8 * objectScale,  // 底部半径
                        height * objectScale,  // 高度
                        6  // 分段数
                    );
                    break;
                
                case 'gravestone':
                    // 创建墓碑（简化为立方体）
                    geometry = new THREE.BoxGeometry(
                        10 * objectScale,  // 宽度
                        height * objectScale,  // 高度
                        3 * objectScale  // 深度
                    );
                    break;
                
                case 'deadTree':
                    // 创建枯树（圆柱形加上顶部变形）
                    geometry = new THREE.CylinderGeometry(
                        1 * objectScale,  // 顶部半径
                        5 * objectScale,  // 底部半径
                        height * objectScale,  // 高度
                        5  // 分段数
                    );
                    break;
                
                case 'torch':
                    // 创建火把（细长圆柱）
                    geometry = new THREE.CylinderGeometry(
                        2 * objectScale,  // 顶部半径
                        1 * objectScale,  // 底部半径
                        height * objectScale,  // 高度
                        6  // 分段数
                    );
                    break;
                
                default:
                    // 默认为圆柱体
                    geometry = new THREE.CylinderGeometry(
                        5 * objectScale,
                        8 * objectScale,
                        height * objectScale,
                        6
                    );
                    break;
            }

            // 创建材质
            const material = new THREE.MeshStandardMaterial({
                color: 0x668866, // 添加绿色调
                roughness: 0.8,  // 添加粗糙度
                metalness: 0.1   // 添加金属感
            });

            // 创建网格
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2; // 旋转使平面水平
            mesh.position.y = -10; // 略微下沉
            mesh.receiveShadow = true; // 启用阴影接收

            // 添加到场景
            this.scene.add(mesh);
            this.objects.set(`background_${index}`, mesh);
            createdCount++;

            // 添加暗色叠加，匹配2D模式中的深色调
            const overlayGeometry = new THREE.PlaneGeometry(10 * objectScale, 10 * objectScale);
            const overlayMaterial = new THREE.MeshBasicMaterial({
                color: 0x202040, // 更深的蓝黑色调
                transparent: true,
                opacity: 0.2,    // 增加不透明度
                side: THREE.DoubleSide,
                depthWrite: false,
            });

            const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
            overlay.rotation.x = -Math.PI / 2;
            overlay.position.y = -9; // 略高于地面
            this.scene.add(overlay);
            this.objects.set(`background_overlay_${index}`, overlay);

            console.log(`创建了 ${createdCount} 个背景对象`);
        } catch (e) {
            console.error(`创建背景对象时出错: ${e.message}`);
        }
    }
}
