// 游戏全局配置文件
// 集中管理需要频繁调整的参数，以优化性能和游戏体验

const CONFIG = {
  // 调试设置
  debug: {
    enabled: false,             // 是否开启调试模式
    showFPS: false,             // 显示帧率
    showColliders: false,       // 显示碰撞框
    logAnimations: false,       // 记录动画日志
    logMissingTextures: false,  // 记录缺失纹理
    logSceneInfo: false,        // 记录场景信息
    logWarnings: true,          // 记录警告信息
    maxConsoleEntries: 100      // 控制台日志最大条数限制
  },
  
  // 渲染相关设置
  rendering: {
    // 基本渲染设置
    maxFPS: 60,                    // 最大帧率
    pixelRatio: 1.0,               // 像素比例(降低以提高性能)
    antialiasing: true,            // 是否开启抗锯齿
    preserveDrawingBuffer: false,  // 是否保留绘图缓冲区
    powerPreference: "default",    // GPU电源偏好："default","high-performance","low-power"
    
    // 阴影设置
    shadows: {
      enabled: true,             // 是否启用阴影
      mapSize: 1024,             // 阴影贴图尺寸(降低以提高性能,原值4096)
      type: "PCFSoftShadow",     // 阴影类型:"Basic","PCF","PCFSoft"
      bias: -0.0002,             // 阴影偏差
      normalBias: 0.01,          // 法线偏差
      radius: 2,                 // 阴影模糊半径
      
      // 主光源阴影相机参数
      camera: {
        near: 1,                 // 近平面
        far: 3000,               // 远平面
        left: -1000,             // 左边界
        right: 1000,             // 右边界
        top: 1000,               // 上边界
        bottom: -1000            // 下边界
      }
    },
    
    // 性能优化设置
    performance: {
      textureQuality: 2,              // 纹理质量: 1=低, 2=中, 3=高
      geometryDetail: 2,              // 几何体细节: 1=低, 2=中, 3=高
      maxVisibleEnemies: 100,         // 最大可见敌人数
      maxVisibleEffects: 50,          // 最大可见特效数
      maxActiveLights: 10,            // 最大活动光源数
      cullingDistance: 1500,          // 裁剪距离
      animationDistance: 800,         // 动画更新距离
      lightsUpdateInterval: 2,        // 光源更新间隔(帧)
      dynamicShadows: false,          // 是否为动态物体启用阴影
      useMipmaps: false,              // 是否使用mipmap(减少远处纹理闪烁)
      limitDrawCalls: true,           // 是否限制绘制调用
      frustumCulling: true,           // 是否启用视锥裁剪
      disableShadowsWhenLagging: true // 当帧率过低时禁用阴影
    }
  },
  
  // 光照设置
  lighting: {
    // 环境光
    ambient: {
      enabled: true,
      color: 0xffffff,
      intensity: 0.7
    },
    
    // 主方向光(太阳光)
    directional: {
      enabled: true,
      color: 0xffffff,
      intensity: 1.2,
      position: { x: 800, y: 1200, z: 800 },
      target: { x: 0, y: -100, z: 0 },
      castShadow: true
    },
    
    // 半球光
    hemisphere: {
      enabled: true,
      skyColor: 0xffffbb,
      groundColor: 0x080820,
      intensity: 0.4
    },
    
    // 补充光
    fill: {
      enabled: true, 
      color: 0xffffff,
      intensity: 0.3,
      position: { x: -600, y: 400, z: -600 },
      target: { x: 200, y: -50, z: 200 },
      castShadow: false
    },
    
    // 背面光
    back: {
      enabled: true,
      color: 0xffffff,
      intensity: 0.3,
      position: { x: 0, y: 200, z: -600 },
      target: { x: 0, y: -50, z: 200 },
      castShadow: false
    },
    
    // 火把光设置
    torch: {
      enabled: true,
      color: 0xff7700,
      intensity: 3,
      distance: 150,
      maxTorches: 10,           // 最大火把数
      animateAll: false,        // 是否为所有火把添加动画
      flickerSpeed: 0.003,
      flickerIntensity: 0.3
    }
  },
  
  // 相机设置
  camera: {
    fov: 30,                    // 视场角
    near: 10,                   // 近裁剪面
    far: 3000,                  // 远裁剪面 
    position: {
      x: 0,
      y: 1500,                 // 相机高度
      z: 1000                  // 相机Z轴偏移
    },
    lookAt: { x: 0, y: 0, z: 0 }, // 焦点位置
    followSpeed: 0.1,           // 跟随速度(0-1)
    enableSmoothFollow: false   // 是否启用平滑跟随(可能导致视觉晕眩)
  },
  
  // 场景设置
  scene: {
    backgroundColor: 0x222222,       // 场景背景色
    groundSize: 9000,                // 地面尺寸
    groundTextureRepeat: 50,        // 地面纹理重复次数
    boundarySize: 1000,              // 游戏边界大小
    backgroundObjectScale: 3,        // 背景对象放大倍数
    
    // 地面材质
    ground: {
      color: 0x668866,
      roughness: 0.8,
      metalness: 0.1,
      receiveShadow: true
    }
  },
  
  // 效果设置
  effects: {
    dashEffectDuration: 20,       // 冲刺效果持续时间
    afterImageDuration: 15,       // 残影效果持续时间
    explosionDuration: 30,        // 爆炸效果持续时间
    maxParticles: 100,            // 最大粒子数量
    dynamicParticles: true,       // 是否使用动态粒子系统
    useAdditiveBlending: true,    // 使用加法混合模式
    useFancyEffects: true         // 启用高级特效
  },
  
  // 模型设置
  models: {
    // 玩家模型
    player: {
      scale: 0.45,
      shadows: true,
      animationSpeed: 1.0,
      fadeTime: 0.2
    },
    
    // 敌人模型缩放
    enemyScales: {
      Zombie: 1.5,
      SkeletonSoldier: 1.5,
      MedusaHead: 0.8,
      BladeSoldier: 1.5,
      SpearGuard: 1.5,
      FireDemon: 0.8
    },
    
    // 敌人高度系数
    enemyHeights: {
      Zombie: 3.0,
      SkeletonSoldier: 3.0,
      MedusaHead: 0.0,
      BladeSoldier: 3.5,
      SpearGuard: 3.2,
      FireDemon: 2.4
    },
    
    // 悬浮高度设置
    floatingHeights: {
      MedusaHead: 80,
      projectiles: 65,
      expOrbs: 50
    }
  },
  
  // 动画设置 
  animations: {
    fadeInTime: 0.2,
    fadeOutTime: 0.2,
    mixingQuality: 2,             // 动画混合质量: 1=低, 2=中, 3=高
    
    // 动画帧率控制
    updateIntervals: {
      torchFlames: 2,             // 每2帧更新一次火把火焰
      torchLights: 3,             // 每3帧更新一次火把光源
      floatingObjects: 2,         // 每2帧更新一次浮动对象
      particleEffects: 1          // 每1帧更新一次粒子效果
    }
  },
  
  // 资源管理
  resources: {
    // 纹理设置
    textures: {
      paths: {
        castleTower: '/images/castle_tower.png',
        brokenPillar: '/images/broken_pillar.png',
        gravestone: '/images/gravestone.png',
        deadTree: '/images/dead_tree.png',
        torch: '/images/torch.png'
      },
      
      // 加载设置
      loading: {
        maxRetries: 3,
        useGeneratedFallbacks: true,  // 使用程序生成的备用纹理
        loadTimeout: 5000,            // 加载超时时间(毫秒)
        preloadAll: false             // 是否预加载所有纹理
      }
    },
    
    // 模型设置  
    models: {
      paths: {
        player: './3dres/player.fbx',
        playerFallback: './3dres/girl1/scene.gltf'
      },
      loadTimeout: 10000,              // 加载超时(毫秒)
      simplifyModels: true,            // 简化高多边形模型
      maxPolygonsPerModel: 10000       // 每个模型最大多边形数
    }
  },
  
  // UI设置
  ui: {
    healthBarWidth: 2.0,               // 血条宽度(相对于实体半径)
    healthBarHeight: 2,                // 血条高度
    dashBarWidth: 1.5,                 // 冲刺条宽度
    dashBarHeight: 1,                  // 冲刺条高度
    barPositionY: 65,                  // 血条Y位置
    barSpacing: 7,                     // 血条与冲刺条间距
    alwaysVisible: false,              // 血条始终可见
    fadeDistance: 300,                 // 血条淡出距离
    showOnDamage: true,                // 受伤时显示血条
    damageDisplayTime: 60              // 受伤后显示血条时间(帧) 
  },
  
  // 后处理效果
  postProcessing: {
    enabled: false,                    // 是否启用后处理
    bloom: {
      enabled: false,
      strength: 0.5,
      threshold: 0.7,
      radius: 0.5
    },
    ssao: {
      enabled: false,
      radius: 4,
      intensity: 1.5
    },
    dof: {
      enabled: false,
      focusDistance: 1000,
      focalLength: 35,
      bokehStrength: 0.5
    }
  },
  
  // 物理/性能权衡设置
  physics: {
    updateInterval: 1,                 // 物理更新间隔(帧)
    maxCollisionsPerFrame: 100,        // 每帧最大碰撞检测数
    simplifiedDistantPhysics: true,    // 远处简化物理计算
    distantUpdateInterval: 3,          // 远处物理更新间隔(帧)
    distantThreshold: 1000,            // 远处阈值
    skipCollisionAfterHit: true        // 命中后跳过碰撞检测
  },
  
  // 移动设备适配设置
  mobile: {
    reduceShadowQuality: true,         // 降低阴影质量
    disableEffects: true,              // 禁用特效
    lowerDrawDistance: true,           // 降低绘制距离
    reduceLights: true,                // 减少光源
    pixelRatio: 0.75,                  // 移动设备像素比
    maxEnemiesVisible: 50,             // 最大可见敌人数量
    useSimpleShaders: true             // 使用简单着色器
  }
};

// 移动设备检测与适配
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  // 如果是移动设备，应用移动设备优化配置
  CONFIG.rendering.pixelRatio = CONFIG.mobile.pixelRatio;
  CONFIG.rendering.shadows.mapSize = 1024; // 降低阴影贴图尺寸
  CONFIG.rendering.antialiasing = false;   // 关闭抗锯齿
  CONFIG.lighting.torch.maxTorches = 5;    // 减少火把数量
  CONFIG.effects.useFancyEffects = false;  // 关闭高级特效

  // 其他移动设备优化
  if (CONFIG.mobile.disableEffects) {
    CONFIG.effects.dynamicParticles = false;
    CONFIG.effects.useAdditiveBlending = false;
  }
  
  if (CONFIG.mobile.reduceShadowQuality) {
    CONFIG.rendering.shadows.type = "Basic";
    CONFIG.rendering.shadows.radius = 1;
  }
}

// 检测WebGL2支持
try {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  
  if (!gl) {
    // 降级设置 - WebGL1
    CONFIG.rendering.shadows.type = "Basic";
    CONFIG.rendering.shadows.mapSize = 1024;
    CONFIG.postProcessing.enabled = false;
    CONFIG.lighting.torch.maxTorches = 5;
  }
} catch (e) {
  console.warn('WebGL2检测失败', e);
}

// 导出配置
export default CONFIG; 