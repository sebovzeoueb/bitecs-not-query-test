import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'main.js',
  sourcemap: true,
  watch: true
})