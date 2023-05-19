/*
Autor: Terran
*/

/**Корневой узел старинцы */
const root = '.guide-view-tab ';
/**Текущий выбранный словарь, у которого создаём поля */
let selectDictonagy = undefined;

exports.init = () => {
    exports.content = U.queryEl(root);
};


exports.refresh = () => {
    U.clearEl(U.queryEl('#dictionarys'));

    const content = U.clearEl(U.queryEl('#dictionarys'));
    Promise.all([
        DBMS.getGuides({})
    ]).then((results) => {
        const [guides] = results;
        const allGuides = Object.entries(guides);
        //Сортируем словари по имени
        allGuides.sort(([p1, a], [p2, b]) => a.name.localeCompare(b.name));

        //Показать предупреждение, если нет справочников
        U.hideEl(U.queryEl(`${root} .alert`), allGuides.length !== 0);

        let index = 0;
        function buildContentInner() {
            if (index < allGuides.length) {
                index++;
                buildContentInner();
            } else {
                allGuides.forEach(([nameGuide, guide]) => {
                    U.addEl(content, makePanel(U.makeText(nameGuide), makeDictionary(guide)));
                });
            }
        }
        buildContentInner();
    }).catch(UI.handleError);
};

/**Создаём описание словаря. Один словарь - одно описание! */
function makeDictionary(guide) {
    const rootDiv = U.makeEl('div');

    try {
       // U.addEls(table, guide.scheme.map(getInput(guide)));
    } catch (err1) {
        UI.handleError(err1); return;
    }

    //Рабочая панель
    let panel = U.qmte(`${root}.guide-tmpl`);

    //Вставляем тексты
    L10n.localizeStatic(panel);
    return U.addEl(rootDiv, panel);
}

function makePanel(title, content) {
    const panelInfo = UI.makePanelCore(title, content);
    UI.attachPanelToggler(panelInfo.a, panelInfo.contentDiv, (event, togglePanel) => {
        togglePanel();
        //            rebuildGutter();
        UI.refreshTextAreas(`${root} #dictionarys textarea`);
    });
    // panelInfo.a.click();
    return panelInfo.panel;
}
// })(window.BriefingExport = {});
