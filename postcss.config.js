// ESM PostCSS config to avoid 'module is not defined' when package.json has type: module
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [tailwindcss, autoprefixer],
};