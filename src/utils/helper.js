const ansiToHtml = require('ansi-to-html');
const ansiConverter = new ansiToHtml();

function generateClientLogHtml(clientId, status, messages) {
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Client ${clientId} Chat Log</title>
      <style>
        @font-face {
          font-family: 'Minecraft';
          src: url('https://fonts.cdnfonts.com/s/16653/Minecraftia-Regular.woff') format('woff');
          font-weight: normal;
          font-style: normal;
        }
        body {
          background-color: #2b2b2b;
          color: #f1f1f1;
          font-family: 'Minecraft', sans-serif;
          padding: 20px;
        }
        .client-header {
          font-weight: bold;
          margin-bottom: 10px;
          color: #00aaff;
        }
        .timestamp {
          color: #888888;
          margin-right: 5px;
        }
        .message {
          margin: 2px 0;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <h1>Client #${clientId} Chat Log</h1>
      <div class="client-header">Status: ${status}</div>
  `;
    messages.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        const messageHtml = ansiConverter.toHtml(msg.text);
        htmlContent += `
      <div class="message">
        <span class="timestamp">${timestamp}</span> - ${messageHtml}
      </div>
    `;
    });
    htmlContent += `
    </body>
    </html>
  `;
    return htmlContent;
}

module.exports = { generateClientLogHtml };