module.exports = {
  apps: [
    {
      name: 'tournament-app',
      script: 'npm',
      args: 'start',
      cwd: '/home/tournament/tournament/tournament-manager', // Set CWD
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        
        // --- Our Revised Port ---
        PORT: 3001,

        // --- Critical DB Fix (authSource=tournament_prod) ---
        DATABASE_URL: 'mongodb://tournament_user:g7Qx!ilx%3D%40P%3D3%24bQ43.r@localhost:27017/tournament_prod?authSource=tournament_prod',
        
        // --- Critical Auth Fix (https://) ---
        AUTH_URL: 'https://tournament.unofficialcrusaderpatch.com',

        // --- Add ALL other secrets here ---
        NEXTAUTH_URL: 'https://tournament.unofficialcrusaderpatch.com',
        AUTH_SECRET: '1c18b9ea8fcd2e038bec9d02741a9d78',
        RESEND_API_KEY: 're_3GxANvy4_2J8t9UZfnYfBQ6ZrT7XSP3nJ',
        
        // ...any other env vars your app needs
      },
    },
  ],
};
