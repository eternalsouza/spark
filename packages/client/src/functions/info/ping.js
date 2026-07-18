export default async (client) => {
  return client.discord.ws.ping.toString();
};

export const aliases = [ 'latency' ];