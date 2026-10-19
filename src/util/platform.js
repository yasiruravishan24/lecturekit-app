import { Capacitor } from '@capacitor/core'

// true inside the iPhone app; false in a browser (development with `quasar dev`, and the automatic tests)
export const isNative = () => Capacitor.isNativePlatform()
