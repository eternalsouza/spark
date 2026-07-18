import fs from 'fs';
import path from 'path';

class CommandLoader {
  constructor(client) {
    this.client = client;
    this.commandsPath = path.join(process.cwd(), 'commands');
  }

  async loadCommands() {
    if (!fs.existsSync(this.commandsPath)) {
      console.warn('⚠️ "commands" folder not found');
      return;
    }

    const commands = await this._loadDirectory(this.commandsPath);
    console.log(`✅ ${commands.length} commands loaded`);
    return commands;
  }

  async _loadDirectory(directory, basePath = '') {
    const commands = [];
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        const subCommands = await this._loadDirectory(itemPath, path.join(basePath, item));
        commands.push(...subCommands);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.mjs'))) {
        const command = await this._loadCommand(itemPath, item, basePath);
        if (command) {
          commands.push(command);
          this.client.commands.set(command.name, command);
          
          if (command.aliases) {
            command.aliases.forEach(alias => {
              this.client.commands.set(alias, {
                ...command,
                isAlias: true,
                mainName: command.name
              });
            });
          }
        }
      }
    }

    return commands;
  }

  async _loadCommand(filePath, fileName, basePath) {
    try {
      delete require.cache[require.resolve(filePath)];
      
      const module = await import(`file://${filePath}?t=${Date.now()}`);
      const commandData = module.default || module;

      const name = commandData.name || fileName.replace('.js', '').replace('.mjs', '');
      
      const pathParts = basePath.split(path.sep).filter(Boolean);
      const category = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'general';

      const command = {
        name: name,
        category: category,
        fullCategory: basePath,
        path: filePath,
        code: commandData.code || '',
        description: commandData.description || 'No description',
        aliases: commandData.aliases || [],
        usage: commandData.usage || '',
        cooldown: commandData.cooldown || 0,
        permissions: commandData.permissions || [],
        ownerOnly: commandData.ownerOnly || false,
        guildOnly: commandData.guildOnly || false,
        execute: commandData.execute || null,
        ...commandData
      };

      if (!command.code && !command.execute) {
        console.warn(`⚠️ Command ${command.name} has no code or execute`);
        return null;
      }

      return command;
    } catch (error) {
      console.error(`❌ Error loading command ${fileName}:`, error);
      return null;
    }
  }

  async reloadCommand(commandName) {
    const command = this.client.commands.get(commandName);
    if (!command) {
      throw new Error(`Command ${commandName} not found`);
    }

    const modulePath = command.path;
    delete require.cache[require.resolve(modulePath)];
    
    const module = await import(`file://${modulePath}?t=${Date.now()}`);
    const newCommand = module.default || module;
    
    this.client.commands.set(commandName, {
      ...command,
      ...newCommand,
      path: command.path,
      category: command.category
    });

    if (newCommand.aliases) {
      newCommand.aliases.forEach(alias => {
        this.client.commands.set(alias, {
          ...command,
          ...newCommand,
          path: command.path,
          category: command.category,
          isAlias: true,
          mainName: commandName
        });
      });
    }

    console.log(`🔄 Command ${commandName} reloaded!`);
    return this.client.commands.get(commandName);
  }

  async reloadAllCommands() {
    this.client.commands.clear();
    await this.loadCommands();
    console.log('🔄 All commands reloaded!');
  }
}

export default CommandLoader;