<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="lk-auth">
        <div class="lk-auth-inner">
          <div class="lk-brand"><span class="lk-brand-icon"><q-icon name="school" size="34px" /></span><span>Lecture Assistant</span></div>
          <router-view />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.lk-auth { display: flex; align-items: center; justify-content: center; padding: calc(24px + var(--lk-safe-top)) 20px calc(24px + var(--lk-safe-bottom)); background: linear-gradient(160deg, #1259b5, #1976d2 55%, #2a9df4); min-height: 100vh; }
.lk-auth-inner { width: 100%; max-width: 420px; }
.lk-brand { display: flex; align-items: center; justify-content: center; gap: 12px; color: #fff; font-size: 24px; font-weight: 500; margin-bottom: 22px; }
.lk-brand-icon { width: 52px; height: 52px; border-radius: 16px; background: rgba(255, 255, 255, 0.18); display: grid; place-items: center; }
</style>
