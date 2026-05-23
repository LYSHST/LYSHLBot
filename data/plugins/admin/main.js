export default {
    admin_qq: [],
    block_keywords: [],
    enable_block: false,
    log_all_messages: true,

    onLoad(ctx, plugin) {
        this.admin_qq = [];
        this.block_keywords = [];
        this.enable_block = false;
        this.log_all_messages = true;
    },

    async onMessage(message, ctx) {
        const rawMsg = (message.raw_message || message.message || '').trim();
        const senderId = String(message.user_id);

        if (rawMsg.startsWith('/管理员')) {
            const adminList = this.admin_qq;

            if (adminList.length > 0 && !adminList.includes(senderId)) {
                return message;
            }

            const args = rawMsg.substring(4).trim().split(/\s+/);
            const command = args[0];

            if (command === '状态') {
                const pluginList = await ctx.getPluginList();
                const status = pluginList.map(p =>
                    `${p.name}: ${p.enabled ? '✅' : '❌'} (优先级: ${p.priority})`
                ).join('\n');

                if (message.message_type === 'group') {
                    await ctx.sendGroupMessage(message.group_id, `插件状态:\n${status}`);
                } else {
                    await ctx.sendPrivateMessage(senderId, `插件状态:\n${status}`);
                }
                return null;
            }

            if (command === '重启') {
                if (message.message_type === 'group') {
                    await ctx.sendGroupMessage(message.group_id, '🔄 正在重启...');
                } else {
                    await ctx.sendPrivateMessage(senderId, '🔄 正在重启...');
                }

                setTimeout(() => {
                    process.exit(0);
                }, 2000);

                return null;
            }

            if (command === '帮助') {
                const helpText = `
管理员命令:
/管理员 状态 - 查看插件状态
/管理员 重启 - 重启服务
/管理员 帮助 - 显示此帮助
                `.trim();

                if (message.message_type === 'group') {
                    await ctx.sendGroupMessage(message.group_id, helpText);
                } else {
                    await ctx.sendPrivateMessage(senderId, helpText);
                }
                return null;
            }
        }

        if (rawMsg === '/ping') {
            const pluginList = await ctx.getPluginList();
            const pluginCount = pluginList.length;
            const enabledCount = pluginList.filter(p => p.enabled).length;

            const reply = `
🏓 Pong!
插件: ${enabledCount}/${pluginCount}
优先级: ${this.priority}
            `.trim();

            if (message.message_type === 'group') {
                await ctx.sendGroupMessage(message.group_id, reply);
            } else {
                await ctx.sendPrivateMessage(senderId, reply);
            }
            return null;
        }

        return message;
    },

    onEnable(ctx, plugin) {},
    onDisable(ctx, plugin) {}
};
