module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        // 你可以在这里添加或覆盖规则
        'no-unused-vars': 'warn', // 将未使用的变量标记为警告而非错误
        'no-console': 'off', // 允许在开发中使用 console
    },
    // Remove globals section as modules are used now
    /*
    globals: {
        THREE: 'readonly',
        Utils: 'readonly',
        Player: 'readonly',
        Game: 'readonly',
        EnemyLibrary: 'readonly',
        WeaponsLibrary: 'readonly',
        Projectile: 'readonly',
        ExperienceOrb: 'readonly',
        Particle: 'readonly',
        Effect: 'readonly',
        Ally: 'readonly',
        ThreeHelper: 'readonly',
    },
    */
};
