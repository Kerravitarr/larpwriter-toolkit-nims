const fs = require('fs');
const path = require('path');

// __dirname всегда указывает на корень, где лежит этот файл
const rootDist = path.join(__dirname, 'dist');
const appDist = path.join(__dirname, 'packages', 'nims-app', 'dist');

// 1. Безопасно удаляем старый dist в корне, если он существует
if (fs.existsSync(rootDist)) {
    console.log('Очистка старой папки dist в корне...');
    fs.rmSync(rootDist, { recursive: true, force: true });
}

// 2. Перемещаем новый dist из пакета nims-app в корень
if (fs.existsSync(appDist)) {
    fs.renameSync(appDist, rootDist);
} else {
    console.error(' Ошибка: Папка dist не найдена в packages/nims-app/. Проверьте, завершилась ли сборка Webpack.');
}
