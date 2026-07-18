export default async (client, context, min, max) => {
  const minNum = parseInt(min) || 0;
  const maxNum = parseInt(max) || 100;
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum).toString();
};

export const aliases = [ 'rando' ];