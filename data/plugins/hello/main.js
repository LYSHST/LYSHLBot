export default {
    greeting: '你好',
    show_version: true,

    onLoad(ctx, plugin) {
        this.greeting = '你好';
        this.show_version = true;
    },

    async onMessage(message, ctx) {
        const rawMsg = (message.raw_message || message.message || '').trim();

        if (rawMsg === '/hello') {
            const greeting = this.greeting || '你好';
            const version = this.show_version ? ` v${this.version || '1.0.0'}` : '';

            const reply = `${greeting}!${version}`;

            if (message.message_type === 'private') {
                await ctx.sendPrivateMessage(message.user_id, reply);
            } else if (message.message_type === 'group') {
                await ctx.sendGroupMessage(message.group_id, reply);
            }

            return null;
        }

        return message;
    },

    onEnable(ctx, plugin) {},
    onDisable(ctx, plugin) {}
};
