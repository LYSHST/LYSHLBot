export default {
    echo_enabled: true,
    echo_prefix: '[Echo]',

    onLoad(ctx, plugin) {
        this.echo_enabled = true;
        this.echo_prefix = '[Echo]';
    },

    async onMessage(message, ctx) {
        if (!this.echo_enabled) {
            return message;
        }

        const rawMsg = (message.raw_message || message.message || '').trim();

        if (rawMsg === '/echo test') {
            if (message.message_type === 'private') {
                await ctx.sendPrivateMessage(
                    message.user_id,
                    `${this.echo_prefix} Test successful!`
                );
            } else if (message.message_type === 'group') {
                await ctx.sendGroupMessage(
                    message.group_id,
                    `${this.echo_prefix} Test successful!`
                );
            }

            return null;
        }

        if (rawMsg.startsWith('/echo ')) {
            const echoText = rawMsg.substring(6).trim();

            if (message.message_type === 'private') {
                await ctx.sendPrivateMessage(message.user_id, echoText);
            } else if (message.message_type === 'group') {
                await ctx.sendGroupMessage(message.group_id, echoText);
            }

            return null;
        }

        return message;
    },

    onEnable(ctx, plugin) {},
    onDisable(ctx, plugin) {}
};
