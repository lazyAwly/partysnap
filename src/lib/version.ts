import pkg from '../../package.json'

export const APP_VERSION = `v${pkg.version}-${process.env.NEXT_PUBLIC_BUILD_SHA}`
