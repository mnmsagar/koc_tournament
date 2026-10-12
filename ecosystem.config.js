const path = require("path");

module.exports = {
  apps: [
    {
      name: "koc-backend",
      cwd: path.join(__dirname, "backend"),
      script: "dist/main.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
        PORT: 6001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 6001,
      },
    },
    {
      name: "koc-frontend",
      cwd: path.join(__dirname, "frontend"),
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
