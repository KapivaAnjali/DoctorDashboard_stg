const https = require('https');

/**
 * Sends a message to a Slack channel via the chat.postMessage API.
 *
 * @param {object} options
 * @param {string} options.token   - Slack Bot token (xoxb-…)
 * @param {string} options.channel - Slack channel ID (e.g. C083EQEB686)
 * @param {string} options.message - Plain-text message (supports Slack mrkdwn)
 * @returns {Promise<boolean>} - true if Slack returned ok:true
 */
async function sendSlackMessage({ token, channel, message }) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ channel, text: message });
    const options = {
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            console.log('Slack notification sent successfully.');
          } else {
            console.warn('Slack notification failed:', parsed.error);
          }
          resolve(parsed.ok === true);
        } catch (_) {
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Slack notification error:', err.message);
      resolve(false);
    });

    req.write(body);
    req.end();
  });
}

module.exports = { sendSlackMessage };
