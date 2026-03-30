require('@webex/plugin-authorization');
// explicitly load wdm, since we're relying on preDiscoveryServices and the url interceptor
require('@webex/internal-plugin-calendar');
require('@webex/internal-plugin-device');
require('@webex/internal-plugin-presence');
require('@webex/internal-plugin-support');
require('@webex/internal-plugin-llm');
require('@webex/plugin-attachment-actions');
require('@webex/plugin-device-manager');
//require('@webex/plugin-logger');
//require('@webex/plugin-meetings');
require('@webex/plugin-messages');
require('@webex/plugin-memberships');
require('@webex/plugin-people');
require('@webex/plugin-rooms');
require('@webex/plugin-teams');
require('@webex/plugin-team-memberships');
require('@webex/plugin-webhooks');

const merge = require('lodash/merge');
const WebexCore = require('@webex/webex-core').default;
let config = {};

const Webex = WebexCore.extend({
  webex: true,
  version: "3.7",
});

Webex.init = function init(attrs = {}) {
  attrs.config = merge(
    {
      sdkType: 'webex',
    },
    config,
    attrs.config
  );

  return new Webex(attrs);
};

module.exports = Webex;