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

    // 立即开始预加载Three.js模块，但不初始化
    preloadThreeJS();
    
    setupEventListeners();
});

// 在页面加载完成后，初始化启动界面
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化启动界面...');

    // 确保启动界面显示
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.classList.add('active');
        console.log('启动界面强制显示已设置');
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

    setupEventListeners();
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
    // "开始游戏"按钮
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
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
        });
    }

    // "设置"按钮
    const optionsBtn = document.getElementById('options-btn');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', () => {
            // 隐藏启动界面，显示设置界面
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('options-menu').classList.remove('hidden');
        });
    }

    // "帮助"按钮
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            // 隐藏启动界面，显示帮助界面
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('help-menu').classList.remove('hidden');
        });
    }

    // "返回菜单"按钮（从设置界面）
    const backToMenu = document.getElementById('back-to-menu');
    if (backToMenu) {
        backToMenu.addEventListener('click', () => {
            // 隐藏设置界面，显示启动界面
            document.getElementById('options-menu').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
        });
    }

    // "返回菜单"按钮（从帮助界面）
    const backFromHelp = document.getElementById('back-from-help');
    if (backFromHelp) {
        backFromHelp.addEventListener('click', () => {
            // 隐藏帮助界面，显示启动界面
            document.getElementById('help-menu').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
        });
    }
}

// 声明全局游戏对象
let game;

// 声明全局测试函数
window.testImageVisibility = function () {
    // 显示所有已加载的图像信息
    if (game && game.images) {
        console.log('===== 测试图像加载状态 =====');
        Object.keys(game.images).forEach((key) => {
            const img = game.images[key];
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
    game = new Game();
    
    // 设置所有事件监听器
    console.log('初始化所有事件监听器');
    game.setupAllEventListeners();
    
    // 先以2D模式启动游戏
    game.is3D = false;
    
    // 启动游戏
    game.start();
    
    // 添加一些初始敌人
    for (let i = 0; i < 5; i++) {
        game.spawnEnemy();
    }
    
    // 显示加载提示
    game.showWarning('正在加载3D模式...', 120);
    
    // 立即加载3D模式
    loadThreeJS();
}

// 加载Three.js
function loadThreeJS() {
    console.log('加载3D模块...');
    
    // 标记加载状态
    if (game) {
        game.threeHelperLoading = true;
    }
    
    // 检查是否已预加载
    if (window._threeJSPreloaded) {
        console.log('使用已预加载的Three.js模块');
    }
    
    // 异步加载Three.js模块并立即初始化
    import('./three-helper.js').then(module => {
        console.log('3D模块加载成功，正在初始化...');
        
        try {
            if (!game) {
                console.error('游戏对象不存在，无法初始化3D模式');
                return;
            }
            
            // 创建ThreeHelper实例
            game.threeHelper = new module.ThreeHelper(game);
            game.threeHelperLoaded = true;
            game.threeHelperLoading = false;
            
            // 设置3D事件监听器
            game.setupMouseEvents();
            
            // 只有在成功创建ThreeHelper后才切换到3D模式
            game.is3D = true;
            
            // 更新Canvas可见性
            game.updateCanvasVisibility();
            
            // 加载纹理
            if (game.threeHelper.loadBackgroundImages) {
                game.threeHelper.loadBackgroundImages(true);
            }
            
            // 显示提示
            game.showWarning('3D模式已加载', 60);
        } catch (error) {
            console.error('3D模块初始化失败:', error);
            
            // 标记加载状态
            if (game) {
                game.threeHelperLoaded = false;
                game.threeHelperLoading = false;
            }
            
            fallbackTo2D();
        }
    }).catch(error => {
        console.error('3D模块加载失败:', error);
        
        // 标记加载状态
        if (game) {
            game.threeHelperLoaded = false;
            game.threeHelperLoading = false;
        }
        
        fallbackTo2D();
    });
}

// 回退到2D模式的辅助函数
function fallbackTo2D() {
    // 加载失败时回退到2D模式
    game.is3D = false;
    
    // 设置2D事件监听器
    game.setupMouseEvents();
    
    // 更新Canvas可见性
    game.updateCanvasVisibility();
    
    game.showWarning('3D模式加载失败，已切换到2D模式', 180);
}

// 预加载Three.js纹理
function preloadTextures() {
    // 确保使用正确的路径
    const textureUrls = [
        '/grass_texture.png',  // 使用绝对路径
        '/castle_tower.png',
        '/broken_pillar.png',
        '/gravestone.png',
        '/dead_tree.png',
        '/torch.png',
    ];

    console.log('预加载3D纹理...');
    console.log('当前路径:', window.location.href);
    console.log('纹理路径:', textureUrls);

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
                (progress) => {
                    console.log(`纹理加载进度 ${url}:`, progress);
                },
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