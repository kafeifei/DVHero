@echo off
chcp 65001 >nul
echo 准备安装Python 3.11长期支持版...

REM 设置下载目录为脚本所在目录
set "DOWNLOAD_DIR=%~dp0"
cd /d "%DOWNLOAD_DIR%"

REM 设置Python安装包URL和文件名
set "PYTHON_URL=https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe"
set "INSTALLER_NAME=python-3.11.8-amd64.exe"

echo 正在下载Python 3.11.8安装包...
REM 使用PowerShell下载Python安装程序
powershell -Command "& {Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%INSTALLER_NAME%'}"

if not exist "%INSTALLER_NAME%" (
    echo 下载失败，请检查网络连接或手动下载Python：
    echo %PYTHON_URL%
    pause
    exit /b 1
)

echo 正在安装Python 3.11.8...
REM 安装Python，添加到PATH，使用标准库，pip
%INSTALLER_NAME% /quiet InstallAllUsers=1 PrependPath=1 Include_test=0

echo 安装完成后，请重启命令提示符以更新环境变量
echo 您可以通过运行 "python --version" 来验证安装
echo 安装完成!

pause 