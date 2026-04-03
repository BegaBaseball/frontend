import { defineConfig } from 'cypress';

export default defineConfig({
    allowCypressEnv: false,
    e2e: {
        baseUrl: 'http://127.0.0.1:5176',
        viewportWidth: 1280,
        viewportHeight: 720,
        video: false,
        screenshotOnRunFailure: true,
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 30000,
        setupNodeEvents(on, config) {
            on('task', {
                log(message) {
                    console.log(message);
                    return null;
                },
            });
        },
    },
});
