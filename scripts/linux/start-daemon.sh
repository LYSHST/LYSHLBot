#!/bin/bash

NAME="LYSHLbot"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$DIR/../logs/daemon.log"
PID_FILE="$DIR/../logs/daemon.pid"

start() {
    if [ -f "$PID_FILE" ]; then
        if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "$NAME 已在运行 (PID: $(cat $PID_FILE))"
            return 1
        else
            rm -f "$PID_FILE"
        fi
    fi

    echo "启动 $NAME..."
    nohup node "$DIR/../backend/node/src/index.js" > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2

    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "$NAME 已启动 (PID: $(cat $PID_FILE))"
    else
        echo "$NAME 启动失败"
        rm -f "$PID_FILE"
        return 1
    fi
}

stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "$NAME 未运行"
        return 1
    fi

    PID=$(cat "$PID_FILE")
    echo "停止 $NAME (PID: $PID)..."
    kill $PID

    for i in {1..10}; do
        if ! kill -0 $PID 2>/dev/null; then
            break
        fi
        sleep 1
    done

    if kill -0 $PID 2>/dev/null; then
        echo "强制停止..."
        kill -9 $PID
    fi

    rm -f "$PID_FILE"
    echo "$NAME 已停止"
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            echo "$NAME 正在运行 (PID: $PID)"
            return 0
        else
            echo "$NAME 未运行 (陈旧的 PID 文件)"
            return 1
        fi
    else
        echo "$NAME 未运行"
        return 1
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    status)
        status
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit $?
