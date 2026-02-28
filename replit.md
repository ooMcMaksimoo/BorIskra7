# Main run command - запускаем веб-сервер
run = ["node", "scripts/web-server.js"]

# Nix environment
[nix]
channel = "stable-24_05"

# Deployment configuration
[deployment]
run = ["npm", "run", "server:prod"]

# Environment for serving static files
[environments.serve]
command = ["node", "scripts/web-server.js"]

# Workflows for development
[workflows.start_frontend]
command = ["npm", "run", "expo:dev"]
trigger = "manual"

[workflows.start_backend]
command = ["npm", "run", "server:dev"]
trigger = "manual"

[workflows.build_web]
command = ["npx", "expo", "export", "--platform", "web"]
trigger = "manual"