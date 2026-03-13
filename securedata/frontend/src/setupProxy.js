const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      ws: true,  // Enable WebSocket proxy
    })
  );
  
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'ws://localhost:8000',
      changeOrigin: true,
      ws: true,
    })
  );
  
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
    })
  );
};
