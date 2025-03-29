#!/bin/bash
echo "启动本地HTTP服务器..."
echo "请访问: http://localhost:8000"
echo "按Ctrl+C停止服务器"
python3 -m http.server 8000
