export default async () => {
  return Math.floor(Date.now() / 1000).toString();
};

export const aliases = [ 'time', 'unix' ];