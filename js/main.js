import * as THREE from 'three';
import { Game } from './game.js'; // Assuming Game class is exported

// 标记事件监听器是否已设置
let eventListenersInitialized = false;

// 在开发服务器连接/重新连接时重置界面状态
if (import.meta.hot) {
    import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('Vite 热更新前 - 重置界面状态');
        
        // 热更新时应清理当前游戏实例
        if (window.game) {
            try {
                window.game.dispose();
                window.game = null;
            } catch (e) {
                console.error('清理游戏实例失败:', e);
            }
        }
        
        // 重置事件监听标记
        eventListenersInitialized = false;
        
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

// 确保页面加载后显示启动界面并只初始化一次事件监听
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

    // 立即开始预加载Three.js模块，但不初始化
    preloadThreeJS();
    
    // 只有当事件监听器尚未初始化时才设置
    if (!eventListenersInitialized) {
        setupEventListeners();
        eventListenersInitialized = true;
    }
    
    // 3秒后显示调试信息
    setTimeout(() => {
        console.log('==== 调试信息 ====');
        const startScreenElement = document.getElementById('start-screen');
        console.log(
            'start-screen:',
            startScreenElement
        );
        console.log('start-screen类名:', startScreenElement?.className);

        const helpMenu = document.getElementById('help-menu');
        console.log('help-menu:', helpMenu);
        console.log('help-menu类名:', helpMenu?.className);

        const optionsMenu = document.getElementById('options-menu');
        console.log('options-menu:', optionsMenu);
        console.log('options-menu类名:', optionsMenu?.className);

        const gameContainer = document.getElementById('game-container');
        console.log('game-container:', gameContainer);
        console.log('game-container类名:', gameContainer?.className);

        const gameLogo = document.getElementById('game-logo');
        console.log('game-logo:', gameLogo);
        console.log('game-logo src:', gameLogo?.src);

        // 检查按钮状态
        console.log('按钮状态:');
        const startGameBtn = document.getElementById('start-game-btn');
        console.log('start-game-btn:', startGameBtn);
        const optionsBtn = document.getElementById('options-btn');
        console.log('options-btn:', optionsBtn);
        const helpBtn = document.getElementById('help-btn');
        console.log('help-btn:', helpBtn);
        const backToMenuBtn = document.getElementById('back-to-menu');
        console.log('back-to-menu:', backToMenuBtn);
        const backFromHelpBtn = document.getElementById('back-from-help');
        console.log('back-from-help:', backFromHelpBtn);
    }, 1000);
});

// 提前预加载ThreeJS而不初始化
function preloadThreeJS() {
    console.log('正在预加载Three.js模块...');
    
    import('./three-helper.js').then(() => {
        console.log('Three.js模块预加载成功');
        window._threeJSPreloaded = true;
    }).catch(error => {
        console.error('Three.js模块预加载失败:', error);
        window._threeJSPreloaded = false;
    });
}

// 设置各按钮事件监听
function setupEventListeners() {
    // 检查是否已经初始化过，避免重复绑定
    if (eventListenersInitialized) {
        console.log('事件监听器已经初始化，跳过重复绑定');
        return;
    }
    
    console.log('正在设置事件监听器');
    
    // "开始游戏"按钮
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        // 移除可能存在的旧监听器
        startGameBtn.removeEventListener('click', handleStartGame);
        // 添加新监听器
        startGameBtn.addEventListener('click', handleStartGame);
    }

    // "设置"按钮
    const optionsBtn = document.getElementById('options-btn');
    if (optionsBtn) {
        optionsBtn.removeEventListener('click', handleOptionsBtn);
        optionsBtn.addEventListener('click', handleOptionsBtn);
    }

    // "帮助"按钮
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.removeEventListener('click', handleHelpBtn);
        helpBtn.addEventListener('click', handleHelpBtn);
    }

    // "返回菜单"按钮（从设置界面）
    const backToMenu = document.getElementById('back-to-menu');
    if (backToMenu) {
        backToMenu.removeEventListener('click', handleBackToMenu);
        backToMenu.addEventListener('click', handleBackToMenu);
    }

    // "返回菜单"按钮（从帮助界面）
    const backFromHelp = document.getElementById('back-from-help');
    if (backFromHelp) {
        backFromHelp.removeEventListener('click', handleBackFromHelp);
        backFromHelp.addEventListener('click', handleBackFromHelp);
    }
    
    // "2D/3D模式切换"按钮
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    if (modeToggleBtn) {
        modeToggleBtn.removeEventListener('click', handleModeToggle);
        modeToggleBtn.addEventListener('click', handleModeToggle);
    }
    
    eventListenersInitialized = true;
}

// 事件处理函数，提取出来方便移除
function handleStartGame() {
    // 检查是否已有游戏实例在运行，如果有则清理
    if (window.game) {
        try {
            window.game.dispose();
            window.game = null;
        } catch (e) {
            console.error('清理旧游戏实例失败:', e);
        }
    }
    
    // 隐藏启动界面
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.classList.remove('active');
        startScreen.classList.add('hidden');
    }

    // 显示游戏容器
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.classList.remove('hidden');
    }

    // 初始化游戏
    initGame();
}

function handleOptionsBtn() {
    // 隐藏启动界面，显示设置界面
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('options-menu').classList.remove('hidden');
}

function handleHelpBtn() {
    // 隐藏启动界面，显示帮助界面
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('help-menu').classList.remove('hidden');
}

function handleBackToMenu() {
    // 隐藏设置界面，显示启动界面
    document.getElementById('options-menu').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

function handleBackFromHelp() {
    // 隐藏帮助界面，显示启动界面
    document.getElementById('help-menu').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

// 模式切换按钮点击处理函数
function handleModeToggle() {
    if (window.game) {
        console.log('切换游戏模式');
        window.game.toggleMode();
        
        // 更新按钮文本内容以反映当前模式
        const modeToggleBtn = document.getElementById('mode-toggle-btn');
        if (modeToggleBtn) {
            modeToggleBtn.textContent = window.game.is3D ? '切换到2D' : '切换到3D';
        }
    }
}

// 声明全局游戏对象
window.game = null;

// 声明全局测试函数
window.testImageVisibility = function () {
    // 显示所有已加载的图像信息
    if (window.game && window.game.images) {
        console.log('===== 测试图像加载状态 =====');
        Object.keys(window.game.images).forEach((key) => {
            const img = window.game.images[key];
            console.log(`图像 ${key}:`, {
                loaded: img.complete,
                width: img.width,
                height: img.height,
                state: img.complete ? '成功' : '失败',
                src: img.src,
            });
        });
    } else {
        console.log('游戏尚未初始化或图像尚未加载');
    }
};

// 初始化游戏函数
function initGame() {
    console.log('初始化游戏...');
    
    // 创建游戏实例（默认以2D模式启动）
    window.game = new Game();
    
    // 设置所有事件监听器
    console.log('初始化所有事件监听器');
    window.game.setupAllEventListeners();
    
    // 设置模式切换按钮监听器
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    if (modeToggleBtn) {
        modeToggleBtn.removeEventListener('click', handleModeToggle);
        modeToggleBtn.addEventListener('click', handleModeToggle);
        modeToggleBtn.textContent = '切换到3D'; // 初始为2D模式
    }
    
    // 先以2D模式启动游戏
    window.game.is3D = false;
    
    // 启动游戏
    window.game.start();
    
    // 添加一些初始敌人
    for (let i = 0; i < 5; i++) {
        window.game.spawnEnemy();
    }
    
    // 显示加载提示
    window.game.showWarning('正在加载3D模式...', 120);
    
    // 立即加载3D模式
    loadThreeJS();
}

// 加载Three.js
function loadThreeJS() {
    console.log('加载3D模块...');
    
    // 标记加载状态
    if (window.game) {
        window.game.threeHelperLoading = true;
    }
    
    // 检查是否已预加载
    if (window._threeJSPreloaded) {
        console.log('使用已预加载的Three.js模块');
    }
    
    // 异步加载Three.js模块并立即初始化
    import('./three-helper.js').then(module => {
        console.log('3D模块加载成功，正在初始化...');
        
        try {
            if (!window.game) {
                console.error('游戏对象不存在，无法初始化3D模式');
                return;
            }
            
            // 创建ThreeHelper实例
            window.game.threeHelper = new module.ThreeHelper(window.game);
            window.game.threeHelperLoaded = true;
            window.game.threeHelperLoading = false;
            
            // 只有在成功创建ThreeHelper后才切换到3D模式
            window.game.is3D = true;
            
            // 更新Canvas可见性
            window.game.updateCanvasVisibility();
            
            // 更新模式切换按钮文本
            const modeToggleBtn = document.getElementById('mode-toggle-btn');
            if (modeToggleBtn) {
                modeToggleBtn.textContent = '切换到2D';
            }
            
            // 设置鼠标事件监听 - 确保在Canvas切换后设置
            setTimeout(() => {
                window.game.setupMouseEvents();
            }, 50);
            
            // 加载纹理
            if (window.game.threeHelper.loadBackgroundImages) {
                window.game.threeHelper.loadBackgroundImages(true);
            }
            
            // 显示提示
            window.game.showWarning('3D模式已加载', 60);
        } catch (error) {
            console.error('3D模块初始化失败:', error);
            
            // 标记加载状态
            if (window.game) {
                window.game.threeHelperLoaded = false;
                window.game.threeHelperLoading = false;
            }
            
            fallbackTo2D();
        }
    }).catch(error => {
        console.error('3D模块加载失败:', error);
        
        // 标记加载状态
        if (window.game) {
            window.game.threeHelperLoaded = false;
            window.game.threeHelperLoading = false;
        }
        
        fallbackTo2D();
    });
}

// 回退到2D模式的辅助函数
function fallbackTo2D() {
    // 加载失败时回退到2D模式
    window.game.is3D = false;
    
    // 设置2D事件监听器
    window.game.setupMouseEvents();
    
    // 更新Canvas可见性
    window.game.updateCanvasVisibility();
    
    // 更新模式切换按钮文本
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    if (modeToggleBtn) {
        modeToggleBtn.textContent = '切换到3D';
    }
    
    window.game.showWarning('3D模式加载失败，已切换到2D模式', 180);
}

// 预加载游戏资源
function preloadTextures() {
    // 预加载纹理以提高游戏启动速度
    const textureLoader = new THREE.TextureLoader();
    
    // 预加载草地纹理和其他对象纹理
    const texturesToPreload = [
        '/images/grass_texture.png',  // 使用绝对路径
        '/images/castle_tower.png',
        '/images/broken_pillar.png',
        '/images/gravestone.png',
        '/images/dead_tree.png',
        '/images/torch.png',
    ];
    
    let loadedCount = 0;
    
    // 遍历并加载每个纹理
    texturesToPreload.forEach(path => {
        // 尝试不同的路径格式
        const tryLoadTexture = (pathIndex = 0) => {
            // 不同格式的路径尝试
            const pathVariations = [
                path,                        // 原始路径 /images/xxx.png
                '.' + path,                  // 相对路径 ./images/xxx.png
                path.substring(1),           // 移除开头的/ 得到 images/xxx.png
                window.location.origin + path // 完整URL
            ];
            
            // 如果已尝试所有变体，则放弃
            if (pathIndex >= pathVariations.length) {
                console.error('无法加载纹理:', path);
                loadedCount++;
                return;
            }
            
            // 当前尝试的路径
            const currentPath = pathVariations[pathIndex];
            
            // 加载纹理
            textureLoader.load(
                currentPath,
                (texture) => {
                    // 纹理加载成功
                    loadedCount++;
                    console.log(`成功预加载纹理: ${path} (${loadedCount}/${texturesToPreload.length})`);
                },
                undefined,
                (error) => {
                    // 该路径加载失败，尝试下一个变体
                    console.warn(`纹理加载失败: ${currentPath}，尝试下一个路径变体`);
                    tryLoadTexture(pathIndex + 1);
                }
            );
        };
        
        // 开始尝试加载
        tryLoadTexture();
    });
}