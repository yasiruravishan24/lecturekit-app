const { defineCapacitorConfig } = require('@quasar/app-vite/capacitor');

module.exports = defineCapacitorConfig({
  appId: 'app.lectureassistant.mobile',
  appName: 'Lecture Assistant',
  ios: { contentInset: 'never' }
});
