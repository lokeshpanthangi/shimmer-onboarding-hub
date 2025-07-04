const http = require('http');

// Test health endpoint
function testHealth() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/chat/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Health Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Health Response:', data);
      testChat();
    });
  });

  req.on('error', (e) => {
    console.error(`Health request error: ${e.message}`);
  });

  req.end();
}

// Test chat endpoint
function testChat() {
  const postData = JSON.stringify({
    message: 'What are the company holidays?'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Chat Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Chat Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Chat request error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

console.log('Testing API endpoints...');
testHealth();