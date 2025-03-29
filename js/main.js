// 游戏主程序
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化游戏...');
    
    // 创建游戏实例
    const game = new Game();
    const modeIndicator = document.getElementById('mode-indicator');
    
    // 更新模式指示器
    function updateModeIndicator() {
        modeIndicator.textContent = game.is3D ? "3D模式" : (canToggle3D ? "2D模式" : "2D模式 (3D功能加载中...)");
    }
    
    // 初始隐藏3D模式指示器
    modeIndicator.textContent = "2D模式 (3D功能加载中...)";
    
    // 3D模式切换功能启用标志
    let canToggle3D = false;
    
    // 键盘事件监听
    document.addEventListener('keydown', (e) => {
        // 设置按键状态
        game.keys[e.key.toLowerCase()] = true;
        
        // 方向键
        if (e.key === 'ArrowUp') game.keys.up = true;
        if (e.key === 'ArrowDown') game.keys.down = true;
        if (e.key === 'ArrowLeft') game.keys.left = true;
        if (e.key === 'ArrowRight') game.keys.right = true;
        
        // 游戏结束时按空格重新开始
        if (e.key === ' ' && game.isGameOver) {
            game.restart();
        }
        
        // 按P键暂停/继续游戏
        if (e.key.toLowerCase() === 'p' && !game.isGameOver) {
            game.isPaused = !game.isPaused;
        }
        
        // 按G键切换2D/3D模式
        if (e.key.toLowerCase() === 'g' && canToggle3D) {
            console.log('切换3D/2D模式');
            game.toggleMode();
            updateModeIndicator();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // 清除按键状态
        game.keys[e.key.toLowerCase()] = false;
        
        // 方向键
        if (e.key === 'ArrowUp') game.keys.up = false;
        if (e.key === 'ArrowDown') game.keys.down = false;
        if (e.key === 'ArrowLeft') game.keys.left = false;
        if (e.key === 'ArrowRight') game.keys.right = false;
    });
    
    // 鼠标事件监听
    game.canvas2d.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // 左键
            game.isDragging = true;
            // 记录拖动开始的位置
            const rect = game.canvas2d.getBoundingClientRect();
            game.dragStartX = e.clientX - rect.left;
            game.dragStartY = e.clientY - rect.top;
            game.dragStartPlayerX = game.player.x;
            game.dragStartPlayerY = game.player.y;
        }
    });
    
    game.canvas3d.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // 左键
            game.isDragging = true;
            // 记录拖动开始的位置
            const rect = game.canvas3d.getBoundingClientRect();
            game.dragStartX = e.clientX - rect.left;
            game.dragStartY = e.clientY - rect.top;
            game.dragStartPlayerX = game.player.x;
            game.dragStartPlayerY = game.player.y;
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) { // 左键
            game.isDragging = false;
            // 清除拖动的起始位置
            game.dragStartX = null;
            game.dragStartY = null;
            game.dragStartPlayerX = null;
            game.dragStartPlayerY = null;
        }
    });
    
    game.canvas2d.addEventListener('mousemove', (e) => {
        // 获取鼠标相对于canvas的位置
        const rect = game.canvas2d.getBoundingClientRect();
        game.mouseX = e.clientX - rect.left;
        game.mouseY = e.clientY - rect.top;
    });
    
    game.canvas3d.addEventListener('mousemove', (e) => {
        // 获取鼠标相对于canvas的位置
        const rect = game.canvas3d.getBoundingClientRect();
        game.mouseX = e.clientX - rect.left;
        game.mouseY = e.clientY - rect.top;
    });
    
    // 阻止右键菜单
    game.canvas2d.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    game.canvas3d.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // 手机/平板触摸支持
    game.canvas2d.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            game.isDragging = true;
            
            const rect = game.canvas2d.getBoundingClientRect();
            game.mouseX = e.touches[0].clientX - rect.left;
            game.mouseY = e.touches[0].clientY - rect.top;
            
            // 记录拖动开始的位置
            game.dragStartX = game.mouseX;
            game.dragStartY = game.mouseY;
            game.dragStartPlayerX = game.player.x;
            game.dragStartPlayerY = game.player.y;
        }
    });
    
    game.canvas3d.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            game.isDragging = true;
            
            const rect = game.canvas3d.getBoundingClientRect();
            game.mouseX = e.touches[0].clientX - rect.left;
            game.mouseY = e.touches[0].clientY - rect.top;
            
            // 记录拖动开始的位置
            game.dragStartX = game.mouseX;
            game.dragStartY = game.mouseY;
            game.dragStartPlayerX = game.player.x;
            game.dragStartPlayerY = game.player.y;
        }
    });
    
    game.canvas2d.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            const rect = game.canvas2d.getBoundingClientRect();
            game.mouseX = e.touches[0].clientX - rect.left;
            game.mouseY = e.touches[0].clientY - rect.top;
        }
    });
    
    game.canvas3d.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            const rect = game.canvas3d.getBoundingClientRect();
            game.mouseX = e.touches[0].clientX - rect.left;
            game.mouseY = e.touches[0].clientY - rect.top;
        }
    });
    
    game.canvas2d.addEventListener('touchend', (e) => {
        e.preventDefault();
        game.isDragging = false;
        // 清除拖动的起始位置
        game.dragStartX = null;
        game.dragStartY = null;
        game.dragStartPlayerX = null;
        game.dragStartPlayerY = null;
    });
    
    game.canvas3d.addEventListener('touchend', (e) => {
        e.preventDefault();
        game.isDragging = false;
        // 清除拖动的起始位置
        game.dragStartX = null;
        game.dragStartY = null;
        game.dragStartPlayerX = null;
        game.dragStartPlayerY = null;
    });
    
    // 页面可见性变化处理（切换标签页时暂停游戏）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (game.isRunning && !game.isPaused && !game.isGameOver) {
                game.isPaused = true;
            }
        }
    });
    
    // 窗口调整大小事件
    window.addEventListener('resize', () => {
        // 调整canvas大小
        const width = game.canvas2d.offsetWidth;
        const height = game.canvas2d.offsetHeight;
        
        game.canvas2d.width = width;
        game.canvas2d.height = height;
        game.canvas3d.width = width;
        game.canvas3d.height = height;
        
        // 同时调整3D渲染器大小
        if (game.is3D && game.threeHelper) {
            game.threeHelper.resize(width, height);
        }
    });
    
    // 确保canvas大小正确
    const width = game.canvas2d.offsetWidth;
    const height = game.canvas2d.offsetHeight;
    
    game.canvas2d.width = width;
    game.canvas2d.height = height;
    game.canvas3d.width = width;
    game.canvas3d.height = height;
    
    // 初始化模式指示器
    updateModeIndicator();
    
    // 预加载Three.js所需的纹理
    preloadTextures();
    
    // 启动游戏
    console.log('启动游戏...');
    game.start();
    
    // 添加一些初始敌人
    for (let i = 0; i < 5; i++) {
        game.spawnEnemy();
    }
    
    // 延迟启用3D模式切换功能，确保游戏已完全加载
    setTimeout(() => {
        // 检查图像是否已加载
        if (game.imagesReady) {
            console.log('3D模式切换功能已启用');
            canToggle3D = true;
            updateModeIndicator();
            
            // 提示用户3D功能已启用
            game.showWarning("3D模式已启用！按G键切换", 180);
        } else {
            console.log('等待图像加载...');
            
            // 设置检查间隔，直到图像加载完成
            const checkInterval = setInterval(() => {
                if (game.imagesReady) {
                    console.log('图像加载完成，3D模式切换功能已启用');
                    canToggle3D = true;
                    updateModeIndicator();
                    
                    // 提示用户3D功能已启用
                    game.showWarning("3D模式已启用！按G键切换", 180);
                    
                    clearInterval(checkInterval);
                }
            }, 1000);
            
            // 设置超时，如果30秒后仍未加载完成，也启用功能但显示警告
            setTimeout(() => {
                if (!canToggle3D) {
                    console.warn('图像加载超时，强制启用3D模式切换');
                    canToggle3D = true;
                    updateModeIndicator();
                    
                    // 提示用户
                    game.showWarning("图像可能未完全加载，3D模式可能不完整，按G尝试切换", 180);
                    
                    clearInterval(checkInterval);
                }
            }, 30000);
        }
    }, 3000);
});

// 预加载Three.js纹理
function preloadTextures() {
    const textureUrls = [
        './images/grass_texture.png',
        './images/castle_tower.png',
        './images/broken_pillar.png',
        './images/gravestone.png',
        './images/dead_tree.png',
        './images/torch.png'
    ];
    
    console.log('预加载3D纹理...');
    
    // 不再自动执行测试，将testImageVisibility作为全局函数导出
    window.testImageVisibility = function() {
        console.log('创建测试图像元素...');
        const debugContainer = document.createElement('div');
        debugContainer.id = 'texture-debug';
        debugContainer.style.position = 'fixed';
        debugContainer.style.bottom = '10px';
        debugContainer.style.right = '10px';
        debugContainer.style.background = 'rgba(0,0,0,0.7)';
        debugContainer.style.padding = '10px';
        debugContainer.style.borderRadius = '5px';
        debugContainer.style.zIndex = '1000';
        debugContainer.style.display = 'flex';
        debugContainer.style.flexDirection = 'column';
        debugContainer.style.gap = '5px';
        
        const title = document.createElement('h4');
        title.textContent = '纹理测试';
        title.style.color = 'white';
        title.style.margin = '0 0 10px 0';
        debugContainer.appendChild(title);
        
        // 尝试每个路径
        const paths = [
            './images/grass_texture.png',
            '/images/grass_texture.png',
            'images/grass_texture.png',
            window.location.origin + '/images/grass_texture.png'
        ];
        
        paths.forEach((path, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.style.marginBottom = '10px';
            
            const label = document.createElement('div');
            label.textContent = `路径 ${index+1}: ${path}`;
            label.style.color = 'white';
            label.style.fontSize = '12px';
            imgContainer.appendChild(label);
            
            const img = document.createElement('img');
            img.src = path;
            img.alt = `纹理 ${index+1}`;
            img.style.width = '100px';
            img.style.height = '100px';
            img.style.border = '1px solid white';
            img.style.display = 'block';
            
            img.onload = () => {
                label.style.color = '#00ff00';
                label.textContent += ` (已加载: ${img.naturalWidth}x${img.naturalHeight})`;
            };
            
            img.onerror = () => {
                label.style.color = '#ff0000';
                label.textContent += ' (加载失败)';
                img.style.display = 'none';
            };
            
            imgContainer.appendChild(img);
            debugContainer.appendChild(imgContainer);
        });
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.padding = '5px';
        closeBtn.style.marginTop = '10px';
        closeBtn.onclick = () => {
            document.body.removeChild(debugContainer);
        };
        debugContainer.appendChild(closeBtn);
        
        document.body.appendChild(debugContainer);
    };
    
    // 不再自动执行纹理测试
    // setTimeout(testImageVisibility, 1000);
    
    // 创建一个隐藏的纹理加载器
    const textureLoader = new THREE.TextureLoader();
    const loadingPromises = textureUrls.map(url => {
        return new Promise((resolve, reject) => {
            textureLoader.load(
                url,
                texture => {
                    console.log(`预加载纹理成功: ${url}`);
                    resolve(texture);
                },
                undefined,
                error => {
                    console.warn(`预加载纹理失败: ${url}`, error);
                    resolve(null); // 即使失败也继续
                }
            );
        });
    });
    
    // 不需要等待预加载完成，这只是为了提前缓存纹理
    Promise.all(loadingPromises)
        .then(textures => {
            window.preloadedTextures = textures.filter(t => t !== null);
            console.log(`预加载完成 ${window.preloadedTextures.length}/${textureUrls.length} 个纹理`);
        })
        .catch(err => {
            console.error('预加载纹理时出错', err);
        });
} 