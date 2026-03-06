// eslint.config.js
const eslintPlugin = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');

module.exports = [
	{
		files: ['**/*.ts'], // Aplica esta configuración solo a archivos TypeScript
		languageOptions: {
			parser: parser, // Referencia directa al parser como un objeto
		},
		plugins: {
			'@typescript-eslint': eslintPlugin, // Plugin como objeto
		},
		rules: {
			quotes: ['warn', 'single'], // Advertir cuando se usan comillas dobles en lugar de simples
			semi: ['error', 'always'], // Exigir el uso de punto y coma al final de cada instrucción
			'@typescript-eslint/no-explicit-any': 'off', // Permitir el uso de 'any'
			curly: ['error', 'all'], // Exigir llaves en las sentencias condicionales y bucles
			'no-extra-semi': 'error', // No permitir puntos y coma adicionales
		},
		ignores: ['build/', 'dist/', 'node_modules/'], // Ignorar estos directorios
	},
];
