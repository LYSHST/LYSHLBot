export default {
    enabled: true,
    reply_delay: 0,
    keywords: [
        { keyword: '你好', reply: '你好呀！有什么可以帮你的吗？' },
        { keyword: 'help', reply: '发送 /help 查看所有命令' },
        { keyword: '版本', reply: '当前版本: 1.0.0' }
    ],

    onLoad(ctx, plugin) {
        this.enabled = true;
        this.reply_delay = 0;
        this.keywords = [
            { keyword: '你好', reply: '你好呀！有什么可以帮你的吗？' },
            { keyword: 'help', reply: '发送 /help 查看所有命令' },
            { keyword: '版本', reply: '当前版本: 1.0.0' }
        ];
    },

    async onMessage(message, ctx) {
        if (!this.enabled) {
            return message;
        }

        const rawMsg = (message.raw_message || message.message || '').trim();

        if (!rawMsg) {
            return message;
        }

        if (rawMsg === '/回复列表') {
            const keywords = this.keywords;
            const list = keywords.map(k => `${k.keyword} → ${k.reply}`).join('\n');
            await ctx.sendGroupMessage(message.group_id, `当前关键词回复:\n${list || '无'}`);
            return null;
        }

        if (rawMsg === '/开启自动回复') {
            this.enabled = true;
            await ctx.sendGroupMessage(message.group_id, '✅ 自动回复已开启');
            return null;
        }

        if (rawMsg === '/关闭自动回复') {
            this.enabled = false;
            await ctx.sendGroupMessage(message.group_id, '❌ 自动回复已关闭');
            return null;
        }

        const keywords = this.keywords;

        for (const item of keywords) {
            if (rawMsg.includes(item.keyword)) {
                const delay = this.reply_delay;
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                if (message.message_type === 'private') {
                    await ctx.sendPrivateMessage(message.user_id, item.reply);
                } else if (message.message_type === 'group') {
                    await ctx.sendGroupMessage(message.group_id, item.reply);
                }

                return null;
            }
        }

        return message;
    },

    onEnable(ctx, plugin) {},
    onDisable(ctx, plugin) {}
};
