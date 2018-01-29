import fs from 'fs'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'

const MODULE = 'layzee'
const VERSION = fs.readFileSync(__dirname +'/../VERSION').toString().trim()
const BANNER = fs.readFileSync(__dirname + '/../templates/header.txt').toString()
  .replace('@YEAR', new Date().getFullYear())
  .replace('@VERSION', VERSION)


function version () {
  return {
    name: 'version',
    transformBundle (code) {
      return code.replace(/VERSION\s+=\s+(['"])[\d\.]+\1/, `VERSION = '${VERSION}'`)
    }
  }
}

export default {
  input: 'index.js',
  output: {
    banner: BANNER,
    name: MODULE,
    format: 'umd',
    file: `dist/${MODULE}.js`,
  },
  plugins: [
    version(),
    resolve({
      main: true,
      module: true
    }),
    commonjs(),
    babel({
      exclude: 'node_modules/**'
    })
  ]
};