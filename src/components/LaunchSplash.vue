<template>
  <div class="lk-splash" role="status" aria-label="Loading">
    <div class="lk-splash-mid">
      <svg class="lk-splash-cap" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12 5 3 9.5l9 4.5 7-3.5V15h2V9.5L12 5zm-5 8.7v2.8c0 1.1 2.2 2.5 5 2.5s5-1.4 5-2.5v-2.8l-5 2.5-5-2.5z" /></svg>
      <div class="lk-splash-name">Lecture Assistant</div>
    </div>
    <q-spinner-dots color="white" size="40px" class="lk-splash-spin" />
  </div>
</template>

<style scoped>
.lk-splash { position: fixed; inset: 0; z-index: 9000; background: linear-gradient(135deg, #1565c0, #2196f3); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.lk-splash-mid { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 0 24px; }
.lk-splash-cap { width: 108px; height: 108px; }
.lk-splash-name { font-size: 26px; font-weight: 600; letter-spacing: -0.01em; }
.lk-splash-spin { position: absolute; bottom: calc(60px + var(--lk-safe-bottom)); }
</style>
