/*
 * Assinatura do plugin de Markdown das docs (implementação em markdown-plugin.mjs).
 * Sem importar tipos do Vite: este arquivo também entra no tsconfig do app, que não tem
 * os tipos do Node. O vite.config.ts converte para Plugin.
 */
export declare function developersMarkdown(): { name: string }
export declare function slugify(text: string): string
