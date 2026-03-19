/*
 * Webex Playbook — RSS → Webex space relay.
 *
 * Polls an RSS/Atom URL on an interval, detects new entries, and posts HTML
 * messages to a Webex space via the Messaging API (POST /v1/messages).
 *
 * Does NOT: handle OAuth installs, multi-tenant hosting, durable deduplication
 * across restarts (in-memory last-entry only), or sanitize feed HTML for XSS.
 *
 * Required env: TOKEN (bot access token), FEED_ROOM_ID, RSS_FEED_URL.
 * See env.template in this folder.
 */

const { bootstrap } = require('global-agent');
const { cleanEnv, str, num } = require('envalid');
const Watcher = require('./lib/feedWatcher');
const logger = require('./src/logger')('app');
const { version } = require('./package.json');

// Initialize Proxy Server, if defined.
if (process.env.GLOBAL_AGENT_HTTP_PROXY) {
  logger.debug('invoke global agent proxy');
  bootstrap();
}

// Process ENV Parameters
const env = cleanEnv(process.env, {
  RSS_INTERVAL: num({ default: 5 }),
  FEED_ROOM_ID: str(),
  RSS_FEED_URL: str(),
  TOKEN: str(),
});

const parserService = require('./src/parserService');

// Load RSS Watcher Instances
const interval = env.RSS_INTERVAL;
const newFeedWatcher = new Watcher(process.env.RSS_FEED_URL, interval);

// Process New Feed
newFeedWatcher.on('new entries', (entries) => {
  entries.forEach((item) => {
    logger.debug('new feed item');
    parserService.parseFeed(item);
  });
});

// Handle New Feed Errors
newFeedWatcher.on('error', (error) => {
  logger.warn(`New Feed Error: ${error}`);
});

// Init Function
async function init() {
  logger.info(`RSS bot Loading, v${version}`);
  try {
    const bot = await parserService.getBot();
    logger.info(`Bot Loaded: ${bot.displayName} (${bot.emails[0]})`);
  } catch (error) {
    logger.error('ERROR: Unable to load Webex Bot, check Token.');
    logger.debug(error.message);
    process.exit(2);
  }
  try {
    const feedRoom = await parserService.getRoom(env.FEED_ROOM_ID);
    logger.info(`Feed Room Name: ${feedRoom.title}`);
  } catch (error) {
    logger.error('ERROR: Bot is not a member of the RSS Feed Room!');
    process.exit(2);
  }

  newFeedWatcher.start();
  logger.info('Startup Complete!');
}

// Initiate
init();

// Handle Graceful Shutdown (CTRL+C)
process.on('SIGINT', () => {
  logger.debug('Stopping...');
  newFeedWatcher.stop();
  logger.debug('Feeds Stopped.');
  process.exit(0);
});
