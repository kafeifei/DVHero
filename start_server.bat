@echo off
chcp 65001 >nul
echo 调试: 脚本开始执行

REM Get the directory where the script is located
set "SCRIPT_DIR=%~dp0"
echo 调试: 脚本目录为 %SCRIPT_DIR%

REM Change to the script's directory
cd /d "%SCRIPT_DIR%"
echo 调试: 已切换到脚本目录

REM 先检查Python是否已安装
echo 调试: 检查Python是否已安装
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未检测到Python，请先安装Python或确保Python已添加到PATH环境变量
    echo 您可以运行install_python.bat来安装Python
    pause
    exit /b 1
)
echo 调试: Python已安装

REM Check if the dist directory exists
echo 调试: 检查dist目录是否存在
if not exist "dist\" (
    echo 警告: dist目录不存在，正在创建...
    mkdir dist
)
echo 调试: dist目录存在

REM Change to the dist directory
cd dist
echo 调试: 已切换到dist目录

echo 警告: dist目录当前为空，服务器将不会显示任何内容，请确保部署内容到此目录
echo 启动本地HTTP服务器，服务dist目录...
echo 请访问: http://localhost:8000
echo 按Ctrl+C停止服务器

REM Start the Python HTTP server
echo 调试: 开始启动Python HTTP服务器
python -m http.server 8000

pause 