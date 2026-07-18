import guild from './guild/index.js';
import user from './user/index.js';
import message from './message/index.js';
import channel from './channel/index.js';
import info from './info/index.js';
import math from './math/index.js';

export default {
  ...info,
  ...message,
  ...guild,
  ...user,
  ...channel,
  ...math
};