import { GlobalRegistrator } from '@happy-dom/global-registrator';

// TODO: console workaround, remove once fixed: https://github.com/oven-sh/bun/issues/6044
const oldConsole = console;
GlobalRegistrator.register();
window.console = oldConsole;
