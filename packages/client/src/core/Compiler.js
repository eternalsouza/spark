class Compiler {
  constructor(client) {
    this.client = client;
  }

  async compile(code, context = {}) {
    const functionRegex = /\$([a-zA-Z_][a-zA-Z0-9_]*)(?:\(([^)]*)\))?/g;
    
    let match;
    let result = code;
    const functionsToProcess = [];

    while ((match = functionRegex.exec(code)) !== null) {
      const [fullMatch, name, argsStr] = match;
      const args = argsStr ? argsStr.split(';').map(a => a.trim()) : [];
      
      functionsToProcess.push({
        fullMatch,
        name,
        args,
        index: match.index
      });
    }

    for (const func of functionsToProcess.reverse()) {
      try {
        const fn = this.client.functions.get(func.name);
        if (!fn) {
          console.warn(`⚠️ Function $${func.name} not found`);
          continue;
        }

        const processedArgs = await Promise.all(
          func.args.map(async arg => {
            if (arg && arg.includes('$')) {
              return await this.compile(arg, context);
            }
            return arg;
          })
        );

        const resultValue = await fn(this.client, context, ...processedArgs);
        code = code.replace(func.fullMatch, resultValue);
      } catch (error) {
        console.error(`❌ Error in $${func.name}:`, error);
        code = code.replace(func.fullMatch, `[Error in $${func.name}]`);
      }
    }

    return code;
  }
}

export default Compiler;