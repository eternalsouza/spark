class CommandHandler {
  constructor(client) {
    this.client = client;
  }

  async handlePrefix(message) {
    const args = message.content.slice(this.client.prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    
    const command = this.client.commands.get(cmdName);
    if (!command) return;

    const mainCommand = command.isAlias ? 
      this.client.commands.get(command.mainName) : 
      command;

    if (mainCommand.guildOnly && !message.guild) {
      return message.reply('❌ This command can only be used in servers.');
    }

    if (mainCommand.ownerOnly && !this.client.owners.includes(message.author.id)) {
      return message.reply('❌ Only the bot owner can use this command.');
    }

    if (mainCommand.permissions && mainCommand.permissions.length > 0) {
      const missingPermissions = mainCommand.permissions.filter(
        perm => !message.member.permissions.has(perm)
      );
      
      if (missingPermissions.length > 0) {
        return message.reply(`❌ You need permissions: ${missingPermissions.join(', ')}`);
      }
    }

    if (mainCommand.cooldown > 0) {
      const key = `${message.author.id}-${mainCommand.name}`;
      const cooldown = this.client.cooldowns.get(key);
      
      if (cooldown) {
        const remaining = (cooldown - Date.now()) / 1000;
        if (remaining > 0) {
          return message.reply(`⏳ Wait ${remaining.toFixed(1)} seconds before using this command again.`);
        }
      }
      
      this.client.cooldowns.set(key, Date.now() + (mainCommand.cooldown * 1000));
      setTimeout(() => {
        this.client.cooldowns.delete(key);
      }, mainCommand.cooldown * 1000);
    }

    const context = {
      author: message.author,
      guild: message.guild,
      channel: message.channel,
      content: message.content,
      args: args,
      reply: message.reply.bind(message),
      message: message
    };

    try {
      if (mainCommand.execute && typeof mainCommand.execute === 'function') {
        const result = await mainCommand.execute(this.client, context, args);
        if (result) {
          await message.reply(result);
        }
        return;
      }

      if (mainCommand.code) {
        const result = await this.client.compiler.compile(mainCommand.code, context);
        if (result && result.trim()) {
          await message.reply(result);
        }
        return;
      }

      console.warn(`⚠️ Command ${mainCommand.name} has no code or execute`);
    } catch (error) {
      console.error(`❌ Error executing command ${mainCommand.name}:`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
  }
}

export default CommandHandler;