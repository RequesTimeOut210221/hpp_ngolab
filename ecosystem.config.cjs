module.exports = {
  apps: [
    {
      name: 'hpp_ngolab',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5002
      }
    }
  ]
};
