import { Client as DiscordClient } from 'discord.js';
import CommandHandler from '../handlers/CommandHandler.js';
import Compiler from './Compiler.js';
import CommandLoader from '../loaders/CommandLoader.js';
import EventLoader from '../loaders/EventLoader.js';
import functions from '../functions/index.js';

class Client {
  constructor(options = {}) {
    this.discord = new DiscordClient({
      intents: options.intents || [
        'Guilds',
        'MessageContent',
        'GuildMessages',
        'GuildMembers',
        'GuildModeration'
      ],
      ...options.discordOptions
    });

    this.token = options.token;
    this.prefix = options.prefix || '!';
    this.owners = options.owners || [];
    this.compiler = new Compiler(this);
    
    this.functions = new Map();
    Object.entries(functions).forEach(([name, fn]) => {
      this.functions.set(name, fn);
    });

    this.commands = new Map();
    this.cooldowns = new Map();

    this.commandLoader = new CommandLoader(this);
    this.eventLoader = new EventLoader(this);
    this.commandHandler = new CommandHandler(this);

    this._setupHandlers();
  }

  _setupHandlers() {
    this.discord.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      if (!message.content.startsWith(this.prefix)) return;
      
      await this.commandHandler.handlePrefix(message);
    });
  }

  async start() {
    await this.discord.login(this.token);
    await this.commandLoader.loadCommands();
    await this.eventLoader.loadEvents();
    
    console.log(`🤖 Bot online as ${this.discord.user.tag}`);
    console.log(`📚 ${this.commands.size} commands loaded`);
    console.log(`📝 Prefix: ${this.prefix}`);
    console.log(`👥 ${this.discord.guilds.cache.size} servers`);
    
    return this;
  }
}

export default Client;