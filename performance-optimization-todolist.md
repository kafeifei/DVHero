# Three.js性能优化任务列表

## 1. 基础设置
- [x] 创建辅助函数`getConfigValue`以安全地获取配置值，避免未定义错误
- [x] 实现条件日志功能，根据`CONFIG.debug`决定是否输出日志

## 2. 渲染器优化
- [x] 修改渲染器创建函数，应用以下配置：
  - [x] 像素比例 (`CONFIG.rendering.pixelRatio`)
  - [x] 抗锯齿设置 (`CONFIG.rendering.antialiasing`)
  - [x] 绘图缓冲区保留 (`CONFIG.rendering.preserveDrawingBuffer`)
  - [x] GPU电源偏好 (`CONFIG.rendering.powerPreference`)
- [x] 实现性能监控，在渲染时间过长时检查`CONFIG.rendering.performance.disableShadowsWhenLagging`

## 3. 阴影系统优化
- [x] 修改主光源阴影设置：
  - [x] 阴影贴图大小 (`CONFIG.rendering.shadows.mapSize`)
  - [x] 阴影类型 (`CONFIG.rendering.shadows.type`)
  - [x] 阴影偏差值 (`CONFIG.rendering.shadows.bias` 和 `CONFIG.rendering.shadows.normalBias`)
  - [x] 阴影模糊半径 (`CONFIG.rendering.shadows.radius`)
- [x] 应用阴影相机参数 (`CONFIG.rendering.shadows.camera`)
- [x] 为动态物体添加条件性阴影 (`CONFIG.rendering.performance.dynamicShadows`)

## 4. 灯光系统优化
- [x] 修改环境光设置 (`CONFIG.lighting.ambient`)
- [x] 修改主方向光设置 (`CONFIG.lighting.directional`)
- [x] 修改半球光设置 (`CONFIG.lighting.hemisphere`)
- [x] 修改补充光设置 (`CONFIG.lighting.fill`)
- [x] 修改背面光设置 (`CONFIG.lighting.back`)
- [x] 实现火把光源限制 (`CONFIG.lighting.torch.maxTorches`)
- [x] 实现有条件的火把动画 (`CONFIG.lighting.torch.animateAll`)
- [x] 优化火把光源动画更新频率 (`CONFIG.animations.updateIntervals.torchLights`)

## 5. 相机优化
- [ ] 修改相机参数：
  - [ ] 视场角 (`CONFIG.camera.fov`)
  - [ ] 近裁剪面 (`CONFIG.camera.near`)
  - [ ] 远裁剪面 (`CONFIG.camera.far`)
  - [ ] 位置 (`CONFIG.camera.position`)
  - [ ] 焦点 (`CONFIG.camera.lookAt`)
- [ ] 实现平滑相机跟随 (`CONFIG.camera.followSpeed`)

## 6. 场景管理优化
- [ ] 修改场景背景色 (`CONFIG.scene.backgroundColor`)
- [ ] 修改地面尺寸和材质 (`CONFIG.scene.groundSize` 和 `CONFIG.scene.ground`)
- [ ] 修改纹理重复次数 (`CONFIG.scene.groundTextureRepeat`)
- [ ] 修改背景对象缩放 (`CONFIG.scene.backgroundObjectScale`)
- [ ] 实现视锥裁剪 (`CONFIG.rendering.performance.frustumCulling`)
- [ ] 实现绘制距离限制 (`CONFIG.rendering.performance.cullingDistance`)

## 7. 纹理与资源优化
- [ ] 实现纹理质量控制 (`CONFIG.rendering.performance.textureQuality`)
- [ ] 控制Mipmap生成 (`CONFIG.rendering.performance.useMipmaps`)
- [ ] 优化纹理过滤器设置
- [ ] 实现纹理加载重试逻辑 (`CONFIG.resources.textures.loading.maxRetries`)
- [ ] 添加纹理加载超时处理 (`CONFIG.resources.textures.loading.loadTimeout`)

## 8. 动画系统优化
- [ ] 实现动画距离检查 (`CONFIG.rendering.performance.animationDistance`)
- [ ] 修改动画混合时间 (`CONFIG.animations.fadeInTime` 和 `CONFIG.animations.fadeOutTime`)
- [ ] 优化火把火焰动画更新频率 (`CONFIG.animations.updateIntervals.torchFlames`)
- [ ] 优化悬浮物体动画更新频率 (`CONFIG.animations.updateIntervals.floatingObjects`)
- [ ] 优化模型动画质量 (`CONFIG.animations.mixingQuality`)

## 9. 游戏对象管理
- [ ] 修改玩家模型设置 (`CONFIG.models.player`)
- [ ] 应用敌人模型缩放 (`CONFIG.models.enemyScales`)
- [ ] 应用敌人高度系数 (`CONFIG.models.enemyHeights`)
- [ ] 修改悬浮高度设置 (`CONFIG.models.floatingHeights`)
- [ ] 实现敌人视觉数量限制 (`CONFIG.rendering.performance.maxVisibleEnemies`)
- [ ] 实现特效数量限制 (`CONFIG.rendering.performance.maxVisibleEffects`)

## 10. UI元素优化
- [ ] 修改血条尺寸与位置 (`CONFIG.ui`)
- [ ] 实现血条距离淡出 (`CONFIG.ui.fadeDistance`)
- [ ] 实现受伤时显示血条 (`CONFIG.ui.showOnDamage` 和 `CONFIG.ui.damageDisplayTime`)
- [ ] 优化UI更新频率

## 11. 特效系统优化
- [ ] 修改冲刺效果持续时间 (`CONFIG.effects.dashEffectDuration`)
- [ ] 修改残影效果持续时间 (`CONFIG.effects.afterImageDuration`)
- [ ] 实现条件特效系统 (`CONFIG.effects.useFancyEffects`)
- [ ] 实现粒子数量限制 (`CONFIG.effects.maxParticles`)
- [ ] 优化特效的混合模式 (`CONFIG.effects.useAdditiveBlending`)

## 12. 移动设备优化
- [ ] 实现设备类型检测，在运行时适配配置
- [ ] 为移动设备应用特定的优化设置 (`CONFIG.mobile`)
- [ ] 优化触摸设备的交互性能

## 13. 物理系统优化
- [ ] 实现物理更新间隔 (`CONFIG.physics.updateInterval`)
- [ ] 实现远处简化物理 (`CONFIG.physics.simplifiedDistantPhysics`)
- [ ] 实现碰撞检测限制 (`CONFIG.physics.maxCollisionsPerFrame`)
- [ ] 实现命中后跳过碰撞检测 (`CONFIG.physics.skipCollisionAfterHit`)

## 14. 后处理与高级优化
- [ ] 条件性启用后处理效果 (`CONFIG.postProcessing`)
- [ ] 实现模型简化 (`CONFIG.resources.models.simplifyModels`)
- [ ] 实现绘制调用限制 (`CONFIG.rendering.performance.limitDrawCalls`)

## 15. 错误处理与监控
- [ ] 增强错误报告和恢复机制
- [ ] 实现性能数据收集和分析
- [ ] 更新警告提示使用配置文件的消息 