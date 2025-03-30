// 工具函数
export const Utils = {
    // 随机整数
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // 计算两点之间的距离
    distance: (x1, y1, x2, y2) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    // 检测碰撞
    checkCollision: (obj1, obj2) => {
        return (
            Utils.distance(obj1.x, obj1.y, obj2.x, obj2.y) <
            obj1.radius + obj2.radius
        );
    },

    // 随机从数组中选择n个元素
    getRandomElements: (array, n) => {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    },
};
