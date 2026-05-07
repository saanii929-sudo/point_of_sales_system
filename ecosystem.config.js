module.exports = {
  apps: [
    {
      name: "pos-system",
      script: "node_modules/next/dist/bin/next.js",
      args: "start -p 3000 -H 0.0.0.0",
      cwd: "./",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      },
      env_file: ".env"
    }
  ]
}