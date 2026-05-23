# 插件开发指南

## 目录结构

```
LYSHLbot/
└── data/
    ├── plugins/              # 插件目录
    │   ├── hello/            # 插件文件夹名（插件 ID）
    │   │   ├── config.js     # 插件信息（必需）
    │   │   └── main.js      # 插件主入口（必需）
    │   ├── echo/
    │   │   ├── config.js
    │   │   └── main.js
    │   └── admin/
    │       ├── config.js
    │       └── main.js
    └── plugin_data/          # 插件运行时数据
        ├── hello/            # 每个插件的独立数据目录
        └── echo/
```

## 创建新插件

### 1. 创建插件文件夹

在 `data/plugins/` 下创建文件夹，文件夹名即为插件 ID：
```
data/plugins/my-plugin/
├── config.js     # 插件信息
└── main.js       # 插件主入口
```

### 2. 编写 config.js（插件信息）

```javascript
export default {
    name: '我的插件',
    version: '1.0.0',
    author: '开发者',
    description: '插件描述',
    priority: 50
};
```

### 3. 编写 main.js（插件主入口）

```javascript
export default {
    greeting: '你好',

    onLoad(ctx, plugin) {
        plugin.greeting = '你好';
    },

    onMessage(message, ctx) {
        const rawMsg = message.raw_message || message.message;

        if (rawMsg === '/命令') {
            await ctx.sendGroupMessage(message.group_id, '响应');
            return null;
        }

        return message;
    },

    onEnable(ctx, plugin) {},
    onDisable(ctx, plugin) {}
};
```

## config.js 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 插件显示名称 |
| version | string | 是 | 插件版本 |
| author | string | 是 | 作者 |
| description | string | 是 | 描述 |
| priority | number | 是 | 优先级 (0-100) |

## main.js 生命周期方法

### ctx 参数（PluginContext）

提供以下方法：

```javascript
// 发送消息
await ctx.sendPrivateMessage(userId, '消息');
await ctx.sendGroupMessage(groupId, '消息');

// 获取插件列表
const plugins = await ctx.getPluginList();

// 优先级控制
ctx.isHigherPriority('other-plugin');
ctx.canControl('target-plugin');

// 获取数据目录
const dataPath = ctx.getDataPath();
```

### plugin 参数（插件实例）

包含插件的配置和运行时数据：

```javascript
// 访问插件配置
plugin.name        // 插件名称
plugin.version     // 版本
plugin.author      // 作者
plugin.priority    // 优先级
plugin.greeting    // 自定义配置

// 直接修改配置
plugin.greeting = 'new value';
```

## 生命周期

| 方法 | 说明 | 执行时机 |
|------|------|----------|
| `onLoad` | 加载 | 插件首次加载时 |
| `onEnable` | 启用 | 插件从禁用变为启用时 |
| `onDisable` | 禁用 | 插件从启用变为禁用时 |
| `onUnload` | 卸载 | 插件被卸载时 |

## 消息处理

### 处理所有消息

```javascript
onMessage(message, ctx) {
    const rawMsg = (message.raw_message || message.message || '').trim();

    if (rawMsg === '/命令') {
        await ctx.sendGroupMessage(message.group_id, '响应');
        return null;  // 拦截消息
    }

    return message;  // 继续传递
}
```

### 分别处理群聊和私聊

```javascript
onGroupMessage(message, ctx) {
    // 只处理群聊消息
    return message;
}

onPrivateMessage(message, ctx) {
    // 只处理私聊消息
    return message;
}
```

## 优先级系统

优先级范围：**0-100**

- 数值越高，优先级越高
- 高优先级插件先处理消息
- 高优先级可以拦截/修改/阻止低优先级的消息
- 低优先级无法影响高优先级的消息

### 示例

| 插件 | 优先级 | 说明 |
|------|--------|------|
| 管理员 | 80 | 最高权限，可拦截所有 |
| Echo | 40 | 普通回显 |
| 自动回复 | 30 | 基础回复 |
| Hello | 10 | 最简单示例 |

## 消息对象结构

```javascript
{
    post_type: 'message',
    message_type: 'group' | 'private',
    user_id: 123456789,
    group_id: 987654321,  // 仅群聊
    raw_message: '原始消息',
    message: '消息内容',
    sender: {
        user_id: 123456789,
        nickname: '用户名',
        card: '群名片'  // 仅群聊
    },
    message_id: 123,
    self_id: 111111111,
    time: 1234567890
}
```

## 示例：完整插件

### config.js
```javascript
export default {
    name: '示例插件',
    version: '1.0.0',
    author: '开发者',
    description: '完整示例插件',
    priority: 50
};
```

### main.js
```javascript
export default {
    prefix: '/',
    enabled: true,

    onLoad(ctx, plugin) {
        plugin.prefix = '/';
        plugin.enabled = true;
    },

    onMessage(message, ctx) {
        if (!plugin.enabled) {
            return message;
        }

        const rawMsg = (message.raw_message || message.message || '').trim();
        const prefix = plugin.prefix;

        if (!rawMsg.startsWith(prefix)) {
            return message;
        }

        const command = rawMsg.substring(prefix.length);

        if (command === 'help') {
            const help = `
可用命令:
${prefix}help - 显示帮助
${prefix}status - 查看状态
            `.trim();

            if (message.message_type === 'group') {
                await ctx.sendGroupMessage(message.group_id, help);
            } else {
                await ctx.sendPrivateMessage(message.user_id, help);
            }
            return null;
        }

        if (command === 'status') {
            const plugins = await ctx.getPluginList();
            const reply = `状态: 正常运行\n插件数: ${plugins.length}`;
            if (message.message_type === 'group') {
                await ctx.sendGroupMessage(message.group_id, reply);
            } else {
                await ctx.sendPrivateMessage(message.user_id, reply);
            }
            return null;
        }

        return message;
    },

    onDisable(ctx, plugin) {
        plugin.enabled = false;
    }
};
```

## 注意事项

1. **插件文件夹名** 即为插件 ID，必须唯一
2. **config.js 是必需的** - 包含插件基本信息
3. **main.js 是必需的** - 包含插件逻辑
4. **优先级设置** - 合理设置避免冲突
5. **返回 null 拦截** - 返回 null 会阻止消息继续传递
6. **数据存储** - 每个插件在 `data/plugin_data/{plugin-id}/` 下有独立目录
