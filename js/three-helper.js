import * as THREE from 'three';
import { generateGrassTexture } from './imageGenerator.js'; // Import the texture generator

// Three.js辅助类
export class ThreeHelper {
    constructor(game) {
        console.log('ThreeHelper构造函数开始执行');
        this.game = game;
        this.canvas3d = game.canvas3d;

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
        this.scene.background = new THREE.Color(0x111111); // 设置更暗的场景背景色

        // 使用正交相机，更适合于俯视角游戏
        // 计算视口参数
        this.viewSize = Math.max(this.canvas3d.height, 600); // 基于画布高度，但不小于600
        const aspectRatio = this.canvas3d.width / this.canvas3d.height;
        
        // 使用OrthographicCamera创建相机
        this.camera = new THREE.OrthographicCamera(
            (-this.viewSize * aspectRatio) / 2,
            (this.viewSize * aspectRatio) / 2,
            this.viewSize / 2,
            -this.viewSize / 2,
            1,
            2000 // 远裁剪面的距离
        );

        // 将相机位置设置为略微向前倾斜的视角，但调整角度使游戏更易看清
        this.camera.position.set(0, 700, 500); // 调整相机高度和前后位置
        this.camera.lookAt(0, 0, 0);
        
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

    // 创建默认3D对象
    createDefaultObjects() {
        // 此方法在新版本中不再需要，但保留空方法以兼容现有代码
        console.log('createDefaultObjects被调用 - 此方法现在是空的');
    }

    // 创建简化版地面，直接使用2D模式同样的平铺方式
    createSimpleGround() {
        console.log('创建简化版地面');

        // 创建几何体 - 大尺寸以确保覆盖视野，增大3倍以匹配放大的背景对象
        const groundGeometry = new THREE.PlaneGeometry(9000, 9000);

        // 使用程序化生成的草地纹理代替加载图片
        const grassCanvas = generateGrassTexture(); // Get the canvas element
        const grassTexture = new THREE.CanvasTexture(grassCanvas); // Create THREE texture from canvas

        // 设置纹理平铺参数
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;

        // 设置重复次数，增加3倍以保持相同的纹理密度
        const repeatX = 2000 / 30 * 3; 
        const repeatY = 2000 / 30 * 3;
        grassTexture.repeat.set(repeatX, repeatY);

        // 纹理过滤 - 使用NearestFilter避免边缘模糊
        grassTexture.magFilter = THREE.NearestFilter;
        grassTexture.minFilter = THREE.NearestFilter;
        grassTexture.generateMipmaps = false; // 关闭mipmap避免边缘混合
        grassTexture.needsUpdate = true;

        // 创建材质 - 降低亮度使其更暗，与2D模式匹配
        const groundMaterial = new THREE.MeshBasicMaterial({
            map: grassTexture, // Apply the generated texture
            side: THREE.DoubleSide,
            color: 0x224422  // 添加深绿色调，使整体更暗
        });

        // 创建地面网格
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // 旋转使平面水平
        ground.position.y = -10; // 略微下沉
        this.scene.add(ground);
        this.objects.set('ground', ground);

        // 添加暗色叠加，匹配2D模式中的深色调
        const overlayGeometry = new THREE.PlaneGeometry(9000, 9000);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: 0x101020, // 更深的蓝黑色调
            transparent: true,
            opacity: 0.5,    // 增加不透明度
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
                console.log('清理现有渲染器...');
                try {
                    this.renderer.dispose();
                    try {
                        this.renderer.forceContextLoss();
                    } catch (e) {
                        console.warn('强制丢失WebGL上下文失败，这是正常现象:', e);
                    }
                    this.renderer = null;
                } catch (e) {
                    console.error('清理渲染器时出错:', e);
                }
            }
            
            // 确保Canvas完全干净，不获取旧的上下文
            console.log('确保Canvas干净...');

            console.log('Canvas 3D信息:', {
                width: this.canvas3d.width,
                height: this.canvas3d.height,
                offsetWidth: this.canvas3d.offsetWidth,
                offsetHeight: this.canvas3d.offsetHeight,
                clientWidth: this.canvas3d.clientWidth, 
                clientHeight: this.canvas3d.clientHeight
            });

            // 确保canvas尺寸合法
            if (this.canvas3d.width < 1 || this.canvas3d.height < 1) {
                console.warn('Canvas尺寸无效，使用窗口尺寸');
                this.canvas3d.width = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientWidth : window.innerWidth;
                this.canvas3d.height = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientHeight : window.innerHeight;
            }

            // 检查WebGL支持
            if (!window.WebGLRenderingContext) {
                console.error('浏览器不支持WebGL');
                return false;
            }

            // 检查WebGL2支持
            try {
                const canWebGL2 = !!window.WebGL2RenderingContext;
                if (canWebGL2) {
                    console.log('浏览器支持WebGL2');
                } else {
                    console.log('浏览器不支持WebGL2，将使用WebGL1');
                }
            } catch (e) {
                console.warn('检查WebGL2支持失败:', e);
            }

            // 使用更安全的选项创建WebGL渲染器
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas3d,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                preserveDrawingBuffer: true,
                failIfMajorPerformanceCaveat: false,
                depth: true,
                stencil: false,
                logarithmicDepthBuffer: false
            });

            // 设置渲染器基本参数
            this.renderer.setSize(this.canvas3d.width, this.canvas3d.height, true); // 改为true，让渲染器自动调整CSS尺寸
            this.renderer.setPixelRatio(window.devicePixelRatio || 1);
            this.renderer.setClearColor(0x222222, 1);

            // 设置阴影
            if (this.renderer.capabilities && this.renderer.capabilities.isWebGL2) {
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            } else if (this.renderer.capabilities) {
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.BasicShadowMap;
            }

            console.log('WebGL渲染器创建成功', {
                isWebGL2: this.renderer.capabilities && this.renderer.capabilities.isWebGL2,
                maxTextures: this.renderer.capabilities && this.renderer.capabilities.maxTextures,
                precision: this.renderer.capabilities && this.renderer.capabilities.precision
            });
            return true;
        } catch (error) {
            console.error('创建WebGL渲染器时出错:', error);

            // 尝试使用极简设置创建
            try {
                console.log('尝试使用极简选项创建渲染器...');
                
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
                this.renderer.setClearColor(0x222222, 1);
                
                // 关闭阴影
                this.renderer.shadowMap.enabled = false;

                console.log('备用渲染器创建成功');
                return true;
            } catch (e) {
                console.error('备用渲染器创建失败:', e);
                
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

        // 遍历游戏中的背景对象
        this.game.backgroundObjects.forEach((obj, index) => {
            try {
                let texture;
                let height = 0;

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
                    
                    // 为整个柱子偏移中心点，使其站立
                    mesh.position.y = -baseHeight / 2;
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
                const scale = (obj.scale || 1) * 3; // 将背景物体尺寸放大3倍

                // 如果是组合对象，直接设置位置
                if (mesh instanceof THREE.Group) {
                    mesh.position.set(obj.x, 0, obj.y);
                    mesh.scale.set(scale, scale, scale);
                } else {
                    mesh.position.set(obj.x, (height * scale) / 2, obj.y);
                }

                // 添加到场景
                this.scene.add(mesh);
                this.objects.set(`background_${index}`, mesh);
                createdCount++;

                // 为火把添加点光源
                if (obj.type === 'torch') {
                    const pointLight = new THREE.PointLight(0xff7700, 3, 150 * 3); // 光照范围也放大3倍
                    pointLight.position.set(obj.x, height * scale * 0.6, obj.y); // 调整光源高度位于火焰位置
                    this.scene.add(pointLight);
                    this.objects.set(`torch_light_${index}`, pointLight);
                    
                    // 添加光照闪烁动画
                    if (!this.animatedLights) {
                        this.animatedLights = [];
                    }
                    pointLight.userData = {
                        baseIntensity: 3,
                        animationOffset: Math.random() * Math.PI * 2
                    };
                    this.animatedLights.push(pointLight);
                }
            } catch (e) {
                console.error(`创建背景对象时出错: ${e.message}`);
            }
        });

        console.log(`创建了 ${createdCount} 个背景对象`);
    }

    // 初始化玩家模型
    initPlayerModel() {
        // 创建玩家主体
        const bodyGeometry = new THREE.SphereGeometry(
            this.game.player.radius,
            16,
            16
        );
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.game.player.color,
            roughness: 0.5,
            metalness: 0.5,
        });

        const playerBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        playerBody.castShadow = true;

        // 创建面朝方向指示器（眼睛）
        const eyeSize = this.game.player.radius * 0.2;
        const eyeGeometry = new THREE.SphereGeometry(eyeSize, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5,
        });

        // 右眼（默认朝向右侧）
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        const eyeOffset = this.game.player.radius * 0.6;
        rightEye.position.set(eyeOffset, 0, 0);
        
        // 左眼（始终存在，与2D模式不同）
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-eyeOffset, 0, 0);

        // 创建玩家组合对象
        const playerGroup = new THREE.Group();
        playerGroup.add(playerBody);
        playerGroup.add(rightEye);
        playerGroup.add(leftEye);
        
        // 保存对眼睛的引用，以便后续更新
        playerGroup.userData.rightEye = rightEye;
        playerGroup.userData.leftEye = leftEye;
        playerGroup.userData.eyeOffset = eyeOffset;
        
        // 设置位置
        playerGroup.position.set(this.game.player.x, 0, this.game.player.y);
        
        this.scene.add(playerGroup);
        this.objects.set('player', playerGroup);
        
        // 创建玩家状态条（血条和冷却条）
        this.createPlayerStatusBars();
    }

    // 更新玩家面朝方向
    updatePlayerDirection() {
        const player = this.objects.get('player');
        if (!player) return;
        
        const facingDirection = this.game.player.facingDirection;
        
        // 根据方向调整眼睛位置
        const rightEye = player.userData.rightEye;
        const leftEye = player.userData.leftEye;
        const offset = player.userData.eyeOffset;
        
        if (facingDirection === 'right') {
            rightEye.position.set(offset, 0, 0);
            leftEye.position.set(-offset, 0, 0);
        } else if (facingDirection === 'left') {
            rightEye.position.set(-offset, 0, 0);
            leftEye.position.set(offset, 0, 0);
        }
    }

    // 创建敌人模型
    createEnemyModel(enemy) {
        let geometry;

        // 根据不同敌人类型创建不同形状
        switch (enemy.constructor.name) {
            case 'Zombie':
                geometry = new THREE.BoxGeometry(
                    enemy.radius * 2,
                    enemy.radius * 2,
                    enemy.radius * 2
                );
                break;
            case 'SkeletonSoldier':
                geometry = new THREE.ConeGeometry(
                    enemy.radius,
                    enemy.radius * 2,
                    4
                );
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
            metalness: 0.3,
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
            metalness: 0.7,
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
            metalness: 0.7,
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

        // 跟随玩家，保持从上方略微向前的视角
        const targetX = player.position.x;
        const targetZ = player.position.z;
        
        // 仅保持相对z方向的偏移，x方向与玩家一致
        this.camera.position.x = targetX;
        this.camera.position.y = 600; // 保持固定高度
        this.camera.position.z = targetZ + 600; // 增加向前偏移，与初始化时一致

        // 始终看向玩家位置
        this.camera.lookAt(targetX, 0, targetZ);
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
        if (!this.renderer || !this.scene || !this.camera) {
            console.warn('渲染器、场景或相机未初始化');
            return false;
        }

        // 检查渲染器状态
        try {
            // 尝试获取渲染器上下文
            const gl = this.renderer.getContext();
            if (!gl) {
                console.error('无法获取WebGL上下文');
                
                // 尝试重新创建渲染器
                if (!this.rendererRecreateAttempts) {
                    this.rendererRecreateAttempts = 0;
                }
                
                if (this.rendererRecreateAttempts < 2) {
                    console.log(`尝试重新创建渲染器 (${this.rendererRecreateAttempts + 1}/2)...`);
                    this.rendererRecreateAttempts++;
                    this.createRenderer();
                    return false;
                } else {
                    console.error('多次尝试重建渲染器失败');
                    return false;
                }
            }
            
            // 检查WebGL上下文是否丢失
            if (gl.isContextLost && gl.isContextLost()) {
                console.error('WebGL上下文已丢失，尝试恢复...');
                
                // 尝试恢复上下文
                try {
                    const loseContext = gl.getExtension('WEBGL_lose_context');
                    if (loseContext) {
                        // 先主动丢失，然后恢复
                        loseContext.loseContext();
                        setTimeout(() => {
                            try {
                                loseContext.restoreContext();
                                console.log('WebGL上下文已恢复');
                            } catch (e) {
                                console.error('恢复上下文失败:', e);
                            }
                        }, 100);
                    } else {
                        // 浏览器不支持WEBGL_lose_context扩展，这是正常的
                        console.warn('浏览器不支持WEBGL_lose_context扩展，这是正常现象');
                    }
                } catch (e) {
                    console.error('尝试恢复上下文时出错:', e);
                }
                
                return false;
            }
        } catch (e) {
            console.error('检查渲染器状态时出错:', e);
            return false;
        }

        // 如果有成功加载的纹理，并且还没有创建过成功纹理地面，则创建一个
        if (this.successTexture && !this.successGroundCreated) {
            try {
                this.createSuccessGround();
                this.successGroundCreated = true;
            } catch (e) {
                console.error('创建成功纹理地面时出错:', e);
            }
        }

        // 记录渲染开始时间（性能监控）
        const renderStartTime = performance.now();

        try {
            // 更新场景中的对象位置
            this.updateSceneObjects();
            
            // 更新场景中的动画对象
            this.animateObjects();
            
            // 更新玩家面朝方向
            this.updatePlayerDirection();
            
            // 更新玩家状态条（血条和技能冷却条）
            this.updatePlayerStatusBars();

            // 更新相机位置
            this.updateCamera();

            // 执行渲染
            this.renderer.render(this.scene, this.camera);
            
            // 记录渲染耗时
            const renderTime = performance.now() - renderStartTime;
            
            // 检测性能问题
            if (renderTime > 100) { // 渲染时间超过100ms可能会导致明显卡顿
                console.warn(`3D渲染耗时过长: ${renderTime.toFixed(2)}ms`);
                
                // 记录慢渲染次数
                this.slowRenderCount = (this.slowRenderCount || 0) + 1;
                
                // 如果持续出现慢渲染，记录警告但不自动切换
                if (this.slowRenderCount > 10) {
                    console.warn('3D渲染性能较差，可能需要切换到2D模式');
                    // 不再自动切换模式，而是在游戏中显示提示
                    if (this.game && this.slowRenderCount === 11) {
                        this.game.showWarning('3D渲染性能较差，可使用G键切换到2D模式', 180);
                    }
                }
            } else {
                // 重置慢渲染计数
                this.slowRenderCount = 0;
            }
            
            // 重置渲染错误计数
            this.renderErrorCount = 0;
            this.renderFailCount = 0;
            this.rendererRecreateAttempts = 0;
            
            return true;
        } catch (e) {
            // 分析错误类型
            let errorMessage = e.message || '未知错误';
            console.error('3D渲染错误:', errorMessage, e);
            
            // 记录错误细节以辅助调试
            try {
                const debugInfo = {
                    message: errorMessage,
                    stack: e.stack,
                    objects: this.scene ? this.scene.children.length : 0,
                    camera: this.camera ? '存在' : '不存在',
                    renderer: this.renderer ? '存在' : '不存在',
                    context: this.renderer && this.renderer.getContext() ? '存在' : '不存在'
                };
                console.log('3D渲染错误详情:', debugInfo);
            } catch (debugError) {
                console.error('无法记录错误详情:', debugError);
            }
            
            // 如果渲染过程中出错，记录错误
            this.renderErrorCount = (this.renderErrorCount || 0) + 1;
            
            if (this.renderErrorCount > 3) {
                // 显示警告但不强制切换
                console.error('3D渲染出错多次');
                if (this.game && this.renderErrorCount === 4) {
                    this.game.showWarning('3D渲染出现问题，可使用G键切换到2D模式', 180);
                }
            }
            
            return false;
        }
    }
    
    // 更新场景中的所有对象位置
    updateSceneObjects() {
        try {
            // 更新玩家位置
            this.updateObjectPosition(
                'player',
                this.game.player.x,
                this.game.player.y
            );
        } catch (e) {
            console.warn('更新玩家位置时出错:', e);
        }

        try {
            // 更新敌人位置
            this.game.enemies.forEach((enemy) => {
                const key = `enemy_${enemy.id}`;
                if (!this.objects.has(key)) {
                    this.createEnemyModel(enemy);
                } else {
                    this.updateObjectPosition(
                        key,
                        enemy.x,
                        enemy.y
                    );
                }
            });
        } catch (e) {
            console.warn('更新敌人位置时出错:', e);
        }

        try {
            // 更新投射物位置
            this.game.projectiles
                .concat(this.game.enemyProjectiles)
                .forEach((projectile) => {
                    const key = `projectile_${projectile.id}`;
                    if (!this.objects.has(key)) {
                        this.createProjectileModel(projectile);
                    } else {
                        this.updateObjectPosition(
                            key,
                            projectile.x,
                            projectile.y,
                            10
                        );
                    }
                });
        } catch (e) {
            console.warn('更新投射物位置时出错:', e);
        }

        try {
            // 更新经验球位置
            this.game.expOrbs.forEach((orb) => {
                const key = `expOrb_${orb.id}`;
                if (!this.objects.has(key)) {
                    this.createExpOrbModel(orb);
                } else {
                    this.updateObjectPosition(
                        key,
                        orb.x,
                        orb.y,
                        5
                    );
                }
            });
        } catch (e) {
            console.warn('更新经验球位置时出错:', e);
        }

        try {
            // 清理已经不存在的对象
            this.objects.forEach((_, key) => {
                if (key.startsWith('enemy_')) {
                    const id = key.replace('enemy_', '');
                    if (!this.game.enemies.some((e) => e.id.toString() === id)) {
                        this.removeObject(key);
                    }
                } else if (key.startsWith('projectile_')) {
                    const id = key.replace('projectile_', '');
                    if (
                        !this.game.projectiles.some(
                            (p) => p.id.toString() === id
                        ) &&
                        !this.game.enemyProjectiles.some(
                            (p) => p.id.toString() === id
                        )
                    ) {
                        this.removeObject(key);
                    }
                } else if (key.startsWith('expOrb_')) {
                    const id = key.replace('expOrb_', '');
                    if (!this.game.expOrbs.some((o) => o.id.toString() === id)) {
                        this.removeObject(key);
                    }
                }
            });
        } catch (e) {
            console.warn('清理对象时出错:', e);
        }
    }

    // 动画更新
    animateObjects() {
        // 更新中心标记，使其旋转
        const centerMarker = this.objects.get('center_marker');
        if (centerMarker) {
            centerMarker.rotation.y += 0.01;
        }

        // 更新火把动画
        if (this.animatedTorches && this.animatedTorches.length > 0) {
            const time = Date.now() * 0.003; // 控制火焰动画速度
            
            for (const torch of this.animatedTorches) {
                if (torch.flameCore && torch.flameOuter) {
                    // 火焰核心的脉动效果
                    const coreScale = 0.9 + 0.2 * Math.sin(time + torch.flameCore.userData.animationOffset);
                    torch.flameCore.scale.x = coreScale;
                    torch.flameCore.scale.z = coreScale;
                    
                    // 火焰外部的摇曳效果
                    const outerScaleX = 0.9 + 0.3 * Math.sin(time * 0.7 + torch.flameOuter.userData.animationOffset);
                    const outerScaleZ = 0.9 + 0.3 * Math.sin(time * 0.8 + torch.flameOuter.userData.animationOffset + 1.0);
                    torch.flameOuter.scale.x = outerScaleX;
                    torch.flameOuter.scale.z = outerScaleZ;
                    
                    // 火焰的随机旋转
                    torch.flameOuter.rotation.x = 0.1 * Math.sin(time * 0.5 + torch.flameOuter.userData.animationOffset);
                    torch.flameOuter.rotation.z = 0.1 * Math.sin(time * 0.6 + torch.flameOuter.userData.animationOffset + 2.0);
                }
            }
        }
        
        // 更新火把光源动画
        if (this.animatedLights && this.animatedLights.length > 0) {
            const time = Date.now() * 0.003;
            
            for (const light of this.animatedLights) {
                if (light.userData && light.userData.baseIntensity) {
                    // 光照强度的闪烁效果
                    const intensityFactor = 0.85 + 0.3 * Math.sin(time * 1.5 + light.userData.animationOffset);
                    light.intensity = light.userData.baseIntensity * intensityFactor;
                    
                    // 添加光照颜色的微小变化，模拟火焰颜色变化
                    const hue = 0.05 + 0.02 * Math.sin(time * 0.8 + light.userData.animationOffset); // 在橙红色范围内变化
                    const saturation = 0.9 + 0.1 * Math.sin(time * 0.7 + light.userData.animationOffset + 1.0);
                    const lightness = 0.5 + 0.1 * Math.sin(time * 0.9 + light.userData.animationOffset + 2.0);
                    
                    // 使用HSL颜色模型创建火焰颜色
                    light.color.setHSL(hue, saturation, lightness);
                }
            }
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

        // 如果未提供尺寸，使用窗口尺寸
        if (!width || !height) {
            width = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientWidth : window.innerWidth;
            height = this.canvas3d.parentElement ? this.canvas3d.parentElement.clientHeight : window.innerHeight;
        }

        // 确保宽高比例正确
        const aspectRatio = width / height;
        
        // 根据新尺寸更新viewSize
        this.viewSize = Math.max(height, 600);

        // 更新相机参数
        this.camera.left = (-this.viewSize * aspectRatio) / 2;
        this.camera.right = (this.viewSize * aspectRatio) / 2;
        this.camera.top = this.viewSize / 2;
        this.camera.bottom = -this.viewSize / 2;
        this.camera.updateProjectionMatrix();

        console.log(`调整渲染器尺寸: ${width}x${height}`);
        this.canvas3d.width = width;
        this.canvas3d.height = height;
        this.renderer.setSize(width, height, true); // 添加true参数使其更新CSS样式
    }

    // 创建灯光
    createLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 增加环境光强度
        this.scene.add(ambientLight);

        // 主方向光 - 从相机方向照射
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 700, 500); // 与相机位置一致
        directionalLight.lookAt(0, 0, 0);
        directionalLight.castShadow = true;

        // 调整阴影相机参数，避免锯齿
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 2000;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        
        // 增加阴影贴图分辨率和质量
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.bias = -0.0005; // 减少阴影痤疮
        
        this.scene.add(directionalLight);

        // 添加辅助照明 - 柔和的半球光提供更自然的环境光照
        const hemisphereLight = new THREE.HemisphereLight(
            0xffffbb, // 天空颜色
            0x080820, // 地面颜色
            0.6       // 强度
        );
        this.scene.add(hemisphereLight);

        // 添加额外的辅助照明 - 背面光源，确保物体背面也有照明
        const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
        backLight.position.set(0, 100, -600); // 从相机对面方向照射
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

        // 创建材质 - 使用BasicMaterial确保可见
        const groundMaterial = new THREE.MeshBasicMaterial({
            map: this.successTexture,
            side: THREE.DoubleSide,
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
            { key: 'castleTower', path: '/castle_tower.png' },
            { key: 'brokenPillar', path: '/broken_pillar.png' },
            { key: 'gravestone', path: '/gravestone.png' },
            { key: 'deadTree', path: '/dead_tree.png' },
            { key: 'torch', path: '/torch.png' },
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
        healthBarBg.position.set(0, this.game.player.radius + 15, 0);
        
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
        healthBarFg.position.set(-offsetX, this.game.player.radius + 15, 0);
        
        // 创建血条组
        const healthBarGroup = new THREE.Group();
        healthBarGroup.add(healthBarBg);
        healthBarGroup.add(healthBarFg);
        
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
        dashBarBg.position.set(0, this.game.player.radius + 8, 0);
        
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
        dashBarFg.position.set(-dashOffsetX, this.game.player.radius + 8, 0);
        
        // 添加冲刺冷却条到场景
        const dashBarGroup = new THREE.Group();
        dashBarGroup.add(dashBarBg);
        dashBarGroup.add(dashBarFg);
        
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
}
