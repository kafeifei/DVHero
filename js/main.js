// 游戏主程序
document.addEventListener('DOMContentLoaded', () => {
    // 创建游戏实例
    const game = new Game();
    
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
    game.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // 左键
            game.isDragging = true;
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) { // 左键
            game.isDragging = false;
        }
    });
    
    game.canvas.addEventListener('mousemove', (e) => {
        // 获取鼠标相对于canvas的位置
        const rect = game.canvas.getBoundingClientRect();
        game.mouseX = e.clientX - rect.left;
        game.mouseY = e.clientY - rect.top;
    });
    
    // 阻止右键菜单
    game.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // 手机/平板触摸支持
    game.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            game.isDragging = true;
            
            const rect = game.canvas.getBoundingClientRect();
            game.mouseX = e.touches[0].clientX - rect.left;
            game.mouseY = e.touches[0].clientY - rect.top;
        }
    });
    
    game.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            const rect = game.canvas.getBoundingClientRect();
            game.mouseX = e.touches[0].clientX - rect.left;
            game.mouseY = e.touches[0].clientY - rect.top;
        }
    });
    
    game.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        game.isDragging = false;
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
        game.canvas.width = game.canvas.offsetWidth;
        game.canvas.height = game.canvas.offsetHeight;
    });
    
    // 确保canvas大小正确
    game.canvas.width = game.canvas.offsetWidth;
    game.canvas.height = game.canvas.offsetHeight;
    
    // 启动游戏
    game.start();
    
    // 添加一些初始敌人
    for (let i = 0; i < 5; i++) {
        game.spawnEnemy();
    }
}); 