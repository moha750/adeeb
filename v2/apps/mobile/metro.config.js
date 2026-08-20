// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require("expo/metro-config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

/**
 * Metro داخل مساحة عمل pnpm.
 *
 * pnpm لا يُسطّح `node_modules`، بل يبني شجرةً من الروابط الرمزيّة. وMetro لا يخرج من جذر
 * المشروع افتراضًا، فلا يرى `packages/core` ولا الحزم المرفوعة إلى جذر المستودع، فيسقط
 * البناءُ بـ«Unable to resolve module».
 *
 * فيُضاف أمران فقط:
 *   `watchFolders`      — ليراقب جذر المستودع كلَّه (وإلّا لم يُعِد البناءَ عند تعديل الحزم المشتركة)
 *   `nodeModulesPaths`  — ليبحث في `node_modules` المشروع ثمّ في `node_modules` الجذر
 *
 * ولا يُلمَس `disableHierarchicalLookup`: تعطيلُه وصفةُ Expo لمساحات npm/yarn المسطّحة،
 * وهو **يكسر** pnpm لأنّ كلَّ حزمةٍ عنده تعتمد على البحث الصاعد لتجد اعتماديّاتها المعزولة.
 */

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
