module.exports = {
  apps: [
    {
      name: 'efiling',
      script: 'dist/main.js',
      cwd: __dirname,
      env_file: '.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '900M',
    },
  ],
};
