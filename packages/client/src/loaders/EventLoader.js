import fs from 'fs';
import path from 'path';

class EventLoader {
  constructor(client) {
    this.client = client;
    this.eventsPath = path.join(process.cwd(), 'events');
    this.loadedEvents = [];
  }

  async loadEvents() {
    if (!fs.existsSync(this.eventsPath)) {
      console.warn('⚠️ "events" folder not found');
      return;
    }

    await this._loadDirectory(this.eventsPath);
    console.log(`✅ ${this.loadedEvents.length} events loaded`);
  }

  async _loadDirectory(directory) {
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        await this._loadDirectory(itemPath);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.mjs'))) {
        await this._loadEventFile(itemPath);
      }
    }
  }

  async _loadEventFile(filePath) {
    try {
      delete require.cache[require.resolve(filePath)];
      
      const module = await import(`file://${filePath}?t=${Date.now()}`);
      const eventData = module.default || module;

      const events = Array.isArray(eventData) ? eventData : [eventData];

      for (const event of events) {
        await this._registerEvent(event, filePath);
      }
    } catch (error) {
      console.error(`❌ Error loading event ${path.basename(filePath)}:`, error);
    }
  }

  async _registerEvent(event, filePath) {
    const { type, code, once = false, name } = event;

    if (!type && !name) {
      console.warn(`⚠️ Event without type in ${path.basename(filePath)}`);
      return;
    }

    const eventName = name || type;

    const handler = async (...args) => {
      try {
        const context = this._createContext(eventName, ...args);
        
        if (code) {
          await this.client.compiler.compile(code, context);
        }
      } catch (error) {
        console.error(`❌ Error in event ${eventName}:`, error);
      }
    };

    if (once) {
      this.client.discord.once(eventName, handler);
    } else {
      this.client.discord.on(eventName, handler);
    }

    this.loadedEvents.push({
      name: eventName,
      type: eventName,
      once,
      file: filePath
    });

    console.log(`✅ Event registered: ${eventName}${once ? ' (once)' : ''}`);
  }

  _createContext(eventName, ...args) {
    const context = {};
    
    switch (eventName) {
      case 'clientReady':
      case 'ready':
        context.client = this.client.discord;
        context.user = this.client.discord.user;
        context.userTag = this.client.discord.user.tag;
        context.userId = this.client.discord.user.id;
        context.guilds = this.client.discord.guilds.cache.size;
        context.users = this.client.discord.users.cache.size;
        break;
        
      case 'messageCreate':
        const message = args[0];
        context.author = message.author;
        context.guild = message.guild;
        context.channel = message.channel;
        context.content = message.content;
        context.message = message;
        context.reply = message.reply.bind(message);
        context.send = message.channel.send.bind(message.channel);
        break;
        
      case 'guildCreate':
        const guild = args[0];
        context.guild = guild;
        context.guildName = guild.name;
        context.guildId = guild.id;
        context.memberCount = guild.memberCount;
        break;
        
      case 'guildDelete':
        const guildDeleted = args[0];
        context.guild = guildDeleted;
        context.guildName = guildDeleted.name;
        context.guildId = guildDeleted.id;
        break;
        
      case 'interactionCreate':
        const interaction = args[0];
        context.user = interaction.user;
        context.guild = interaction.guild;
        context.channel = interaction.channel;
        context.reply = interaction.reply.bind(interaction);
        break;
        
      default:
        context.args = args;
    }
    
    return context;
  }

  async reloadAllEvents() {
    this.client.discord.removeAllListeners();
    this.loadedEvents = [];
    await this.loadEvents();
    console.log('🔄 All events reloaded!');
  }

  async reloadEvent(eventName) {
    const event = this.loadedEvents.find(e => e.name === eventName);
    if (!event) {
      throw new Error(`Event ${eventName} not found`);
    }

    this.client.discord.removeAllListeners(eventName);
    this.loadedEvents = this.loadedEvents.filter(e => e.name !== eventName);

    delete require.cache[require.resolve(event.file)];
    await this._loadEventFile(event.file);
    
    console.log(`🔄 Event ${eventName} reloaded!`);
  }
}

export default EventLoader;