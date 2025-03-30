#!/bin/bash

# 获取脚本所在的目录，无论从哪里执行
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 切换到项目根目录
cd "$SCRIPT_DIR"

# 确保dist目录存在
if [ ! -d "dist" ]; then
    echo "错误: dist目录不存在，请先运行 npm run build"
    exit 1
fi

# 切换到dist目录
cd dist

echo "启动本地HTTP服务器，服务dist目录..."
echo "请访问: http://localhost:8000"
echo "按Ctrl+C停止服务器"
python3 -m http.server 8000
