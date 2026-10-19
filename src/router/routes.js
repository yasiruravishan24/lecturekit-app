// The log-in pages sit in their own layout; everything else needs a login (see router/index.js).
const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: () => import('@/pages/HomePage.vue'), meta: { title: 'My courses' } },
      { path: 'settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue'), meta: { title: 'Settings', back: true } },
      { path: 'capture', name: 'capture', component: () => import('@/pages/CapturePage.vue'), meta: { title: 'Capture lecture', back: true } },
      { path: 'modules/:id', name: 'module', component: () => import('@/pages/ModulePage.vue'), props: true, meta: { title: 'Module', back: true } },
      { path: 'sessions/:id', name: 'session', component: () => import('@/pages/SessionPage.vue'), props: true, meta: { title: 'Lecture', back: true } },
      { path: 'quiz/:id', name: 'quiz', component: () => import('@/pages/QuizPage.vue'), props: true, meta: { title: 'Quiz', back: true } },
      { path: 'notifications', name: 'notifications', component: () => import('@/pages/NotificationsPage.vue'), meta: { title: 'Notifications', back: true } },
      { path: 'spike', name: 'spike', component: () => import('@/pages/SpikePage.vue'), meta: { title: 'Recording test', back: true } },
    ],
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { guest: true },
    children: [
      { path: 'login', name: 'login', component: () => import('@/pages/LoginPage.vue') },
      { path: 'register', name: 'register', component: () => import('@/pages/RegisterPage.vue') },
      { path: 'verify', name: 'verify', component: () => import('@/pages/VerifyPage.vue') },
    ],
  },
  // the short addresses the pages use
  ...['login', 'register', 'verify'].map((name) => ({ path: `/${name}`, redirect: (to) => ({ name, query: to.query }) })),
  // a build made with LK_SELFTEST=1 records for 50 seconds by itself on start and writes the result file (used to test the native recorder in the Simulator)
  ...(import.meta.env.LK_SELFTEST ? [{ path: '/selftest', component: () => import('@/pages/SpikePage.vue'), props: { auto: true } }] : []),
  { path: '/:catchAll(.*)*', component: () => import('@/pages/ErrorNotFound.vue') },
]

export default routes
