import * as THREE from 'three';
import { Game } from './game.js'; // Assuming Game class is exported

// 在开发服务器连接/重新连接时重置界面状态
if (import.meta.hot) {
    import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('Vite 热更新前 - 重置界面状态');
        
        // 延迟执行以确保DOM更新完成
        setTimeout(() => {
            const startScreen = document.getElementById('start-screen');
            const optionsMenu = document.getElementById('options-menu');
            const helpMenu = document.getElementById('help-menu');
            const gameContainer = document.getElementById('game-container');
            
            if (startScreen) startScreen.classList.add('active');
            if (startScreen) startScreen.classList.remove('hidden');
            if (optionsMenu) optionsMenu.classList.add('hidden');
            if (helpMenu) helpMenu.classList.add('hidden');
            if (gameContainer) gameContainer.classList.add('hidden');
            
            console.log('热更新后启动界面已重置');
        }, 200);
    });
}

// 确保页面加载后显示启动界面
window.addEventListener('load', function() {
    // 确保所有菜单状态正确
    const startScreen = document.getElementById('start-screen');
    const optionsMenu = document.getElementById('options-menu');
    const helpMenu = document.getElementById('help-menu');
    const gameContainer = document.getElementById('game-container');
    
    if (startScreen) startScreen.classList.add('active');
    if (startScreen) startScreen.classList.remove('hidden');
    if (optionsMenu) optionsMenu.classList.add('hidden');
    if (helpMenu) helpMenu.classList.add('hidden');
    if (gameContainer) gameContainer.classList.add('hidden');
    
    console.log('启动界面强制显示已设置');
});

// 游戏主程序
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化启动界面...');
    
    // DOM元素引用
    const startScreen = document.getElementById('start-screen');
    const optionsMenu = document.getElementById('options-menu');
    const helpMenu = document.getElementById('help-menu');
    const gameContainer = document.getElementById('game-container');
    
    // 按钮引用
    const startGameBtn = document.getElementById('start-game-btn');
    const optionsBtn = document.getElementById('options-btn');
    const helpBtn = document.getElementById('help-btn');
    const backToMenuBtn = document.getElementById('back-to-menu');
    const backFromHelpBtn = document.getElementById('back-from-help');
    
    // 游戏实例
    let game = null;
    let canToggle3D = true;
    
    // 菜单导航函数
    function showStartMenu() {
        startScreen.classList.remove('hidden');
        startScreen.classList.add('active');
        optionsMenu.classList.add('hidden');
        helpMenu.classList.add('hidden');
        gameContainer.classList.add('hidden');
    }
    
    function showOptionsMenu() {
        startScreen.classList.add('hidden');
        optionsMenu.classList.remove('hidden');
        helpMenu.classList.add('hidden');
        gameContainer.classList.add('hidden');
    }
    
    function showHelpMenu() {
        startScreen.classList.add('hidden');
        optionsMenu.classList.add('hidden');
        helpMenu.classList.remove('hidden');
        gameContainer.classList.add('hidden');
    }
    
    function startGame() {
        startScreen.classList.add('hidden');
        optionsMenu.classList.add('hidden');
        helpMenu.classList.add('hidden');
        
        // 显示加载画面
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载游戏资源...</div>
        `;
        document.body.appendChild(loadingScreen);
        
        // 延迟一点时间以显示加载画面
        setTimeout(() => {
            // 初始化游戏
            initGame();
            
            // 游戏初始化完成后，移除加载画面并显示游戏容器
            setTimeout(() => {
                document.body.removeChild(loadingScreen);
                gameContainer.classList.remove('hidden');
            }, 1000);
        }, 500);
    }
    
    // 初始化菜单事件监听
    startGameBtn.addEventListener('click', startGame);
    optionsBtn.addEventListener('click', showOptionsMenu);
    helpBtn.addEventListener('click', showHelpMenu);
    backToMenuBtn.addEventListener('click', showStartMenu);
    backFromHelpBtn.addEventListener('click', showStartMenu);
    
    // 初始化游戏函数
    function initGame() {
        console.log('初始化游戏...');
        
        // 创建游戏实例
        game = new Game();
        const modeIndicator = document.getElementById('mode-indicator');

        // 更新模式指示器
        function updateModeIndicator() {
            modeIndicator.textContent = game.is3D
                ? '3D模式'
                : canToggle3D
                ? '2D模式'
                : '2D模式 (3D功能加载中...)';
        }

        // 初始显示3D模式指示器
        modeIndicator.textContent = '3D模式';

        // 键盘事件监听
        document.addEventListener('keydown', (e) => {
            // ESC键返回主菜单
            if (e.key === 'Escape') {
                if (!game.isGameOver && !game.isPaused) {
                    game.isPaused = true;
                    
                    // 显示暂停菜单确认
                    if (confirm('是否返回主菜单？\n当前游戏进度将丢失。')) {
                        // 清理游戏资源
                        if (game.is3D && game.threeHelper) {
                            game.threeHelper.dispose();
                        }
                        game.isRunning = false;
                        game = null;
                        
                        // 返回主菜单
                        showStartMenu();
                    } else {
                        game.isPaused = false;
                    }
                    return;
                }
            }
            
            // 设置按键状态
            if (!game) return;
            
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
                // 确保使用import动态加载ThreeHelper
                if (!game.is3D) {
                    // 如果当前是2D模式要切换到3D，需要确保ThreeHelper已加载
                    import('./three-helper.js').then(module => {
                        if (!game.threeHelper) {
                            console.log('创建3D渲染器...');
                            game.threeHelper = new module.ThreeHelper(game);
                            // 加载纹理和创建背景对象
                            if (game.threeHelper.loadBackgroundImages) {
                                game.threeHelper.loadBackgroundImages(true);
                            }
                        }
                        // 切换模式
                        game.toggleMode();
                        updateModeIndicator();
                    });
                } else {
                    // 从3D切换到2D
                    game.toggleMode();
                    updateModeIndicator();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            // 清除按键状态
            if (!game) return;
            
            game.keys[e.key.toLowerCase()] = false;

            // 方向键
            if (e.key === 'ArrowUp') game.keys.up = false;
            if (e.key === 'ArrowDown') game.keys.down = false;
            if (e.key === 'ArrowLeft') game.keys.left = false;
            if (e.key === 'ArrowRight') game.keys.right = false;
        });

        // 鼠标事件监听
        game.canvas2d.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                // 左键
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
            if (e.button === 0) {
                // 左键
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
            if (e.button === 0 && game) {
                // 左键
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
            if (document.hidden && game) {
                if (game.isRunning && !game.isPaused && !game.isGameOver) {
                    game.isPaused = true;
                }
            }
        });

        // 窗口调整大小事件
        window.addEventListener('resize', () => {
            if (!game) return;
            
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
        
        // 初始化3D渲染器并直接开始3D模式
        import('./three-helper.js').then(module => {
            // 创建3D渲染器
            console.log('初始化3D渲染器...');
            game.threeHelper = new module.ThreeHelper(game);
            
            // 更新Canvas可见性，确保3D模式可见
            game.updateCanvasVisibility();
            
            // 等待纹理加载
            console.log('等待纹理加载...');
            
            // 显式调用同步版本的loadBackgroundImages
            if (game.threeHelper.loadBackgroundImages) {
                console.log('手动调用同步版本的loadBackgroundImages...');
                game.threeHelper.loadBackgroundImages(true);  // 传入true表示使用同步模式
            }
            
            // 延长等待时间，确保纹理和背景对象都已创建完成
            setTimeout(() => {
                // 启动游戏
                console.log('启动游戏...');
                game.start();
                
                // 添加一些初始敌人
                for (let i = 0; i < 5; i++) {
                    game.spawnEnemy();
                }
                
                // 提示用户游戏已在3D模式下启动
                game.showWarning('游戏已在3D模式下启动！按G键可切换到2D', 180);
            }, 500);  // 等待500ms确保初始化完成
        });
    }
});

// 预加载Three.js纹理
function preloadTextures() {
    const textureUrls = [
        '/grass_texture.png',
        '/castle_tower.png',
        '/broken_pillar.png',
        '/gravestone.png',
        '/dead_tree.png',
        '/torch.png',
    ];

    console.log('预加载3D纹理...');

    // 不再自动执行测试，将testImageVisibility作为全局函数导出
    window.testImageVisibility = function () {
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
            '/grass_texture.png',
            './grass_texture.png',
            'grass_texture.png',
            window.location.origin + '/grass_texture.png',
        ];

        paths.forEach((path, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.style.marginBottom = '10px';

            const label = document.createElement('div');
            label.textContent = `路径 ${index + 1}: ${path}`;
            label.style.color = 'white';
            label.style.fontSize = '12px';
            imgContainer.appendChild(label);

            const img = document.createElement('img');
            img.src = path;
            img.alt = `纹理 ${index + 1}`;
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
    const loadingPromises = textureUrls.map((url) => {
        return new Promise((resolve /*, reject*/) => {
            textureLoader.load(
                url,
                (texture) => {
                    console.log(`预加载纹理成功: ${url}`);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.warn(`预加载纹理失败: ${url}`, error);
                    resolve(null); // 即使失败也继续
                }
            );
        });
    });

    // 不需要等待预加载完成，这只是为了提前缓存纹理
    Promise.all(loadingPromises)
        .then((textures) => {
            window.preloadedTextures = textures.filter((t) => t !== null);
            console.log(
                `预加载完成 ${window.preloadedTextures.length}/${textureUrls.length} 个纹理`
            );
        })
        .catch((err) => {
            console.error('预加载纹理时出错', err);
        });
}
