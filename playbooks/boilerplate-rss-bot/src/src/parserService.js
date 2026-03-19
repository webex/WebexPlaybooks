const { cleanEnv, str } = require('envalid');
const logger = require('./logger')('parserService');
const httpService = require('./httpService');

// Process ENV Parameters
const env = cleanEnv(process.env, {
  TOKEN: str(),
  FEED_ROOM_ID: str(),
  RSS_FEED_URL: str(),
});

function parserService() {
  function formatDescription(description) {
    // Implement custom formatting to description field
    let formatted = description;
    formatted = formatted.replace(/\r?\n|\r/g, '<br />');
    formatted = formatted.replace(/<strong>-- /g, '<strong>');
    formatted = formatted.replace(/ --<\/strong>/g, '</strong>');
    return formatted;
  }

  async function getBot() {
    const bot = await httpService.getField(env.TOKEN, 'people/me');
    return bot;
  }

  async function getRoom(roomId) {
    const room = await httpService.getField(env.TOKEN, `rooms/${roomId}`);
    return room;
  }

  async function parseFeed(item) {
    const output = {};
    logger.debug('EVENT: NEW FEED');
    output.title = item.title;
    output.description = formatDescription(item.description);
    output.guid = item.guid.replace(/\r\n/g, '');
    output.link = item.link;

    //message that the bot will send to space
    let html = `<h4><a href="${output.link}">${output.title}</a></h4><p>${output.description}<p>`;

    await httpService.postMessage(env.TOKEN, env.FEED_ROOM_ID, html);
    const jsonOutput = JSON.stringify(output);
    logger.debug(`Output: ${jsonOutput}`);
  }

  return {
    getBot,
    getRoom,
    parseFeed,
  };
}

module.exports = parserService();
