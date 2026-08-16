// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Сайт публикуется как project-страница GitHub Pages в подпапке /mtoalliance/.
  // site + base нужны, чтобы ссылки на бандлы и статику вели на правильный путь.
  site: 'https://si0683.github.io',
  base: '/mtoalliance/',
});
