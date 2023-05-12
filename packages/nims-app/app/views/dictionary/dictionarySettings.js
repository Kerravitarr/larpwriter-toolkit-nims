/*
Autor: Terran
*/

/**Корневой узел старинцы */
const root = '.dictionary-settings-tab ';

exports.init = () => {

    const createGuideDialog = UI.createModalDialog(
        root,
        createGuide, {
            bodySelector: 'modal-prompt-body',
            dialogTitle: `dictionary-create-title`,
            actionButtonTitle: 'common-create',
        }
    );
    U.listen(U.qe(`${root}.dictionary-create`), 'click', () => createGuideDialog.showDlg());

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
    //Диалог переименовния словаря
    const renameGuideDialog = UI.createModalDialog(
        root,
        renameGuide, {
        bodySelector: 'modal-prompt-body',
        dialogTitle:  `dictionary-rename_title`,
        actionButtonTitle: 'common-rename',
    });
    U.qee(renameGuideDialog, '.entity-input').value = renameGuideDialog.fromName = guide.name;

    //Диалог добавления полей
    const createProfileItemDialog = UI.createModalDialog(
        root,
        createProfileItem, 
        {
            bodySelector: 'create-guide-item-body',
            dialogTitle: 'dictionary-item_field_create',
            actionButtonTitle: 'common-create',
            initBody: (body) => {
                //Заполняем позиции полей
                
                //U.arr2Select(["Первый","Второй"])

                //Заполняем типы полей
                const fillItemTypesSel = sel => U.fillSelector(sel, UI.constArr2Select(R.keys(Constants.profileFieldTypes)));
                const sel = U.clearEl(U.qee(body, '.create-entity-type-select'));
                const fillMainSel = () => { fillItemTypesSel(U.clearEl(sel)); };
                fillMainSel();
                L10n.onL10nChange(fillMainSel);
            }
        }
    );


    //Рабочая панель
    let panel = U.qmte(`${root}.tablePanel-tmpl`);

    //Создаём слушателей на кнопки для словаря в целом
    U.listen(U.qee(panel, '.create'), 'click', () => createProfileItemDialog.showDlg());
    U.listen(U.qee(panel, '.rename'), 'click', () => renameGuideDialog.showDlg());
    U.listen(U.qee(panel, '.remove'), 'click', () => {
        UI.confirm(CU.strFormat(L10n.getValue('dictionary-remove_text'), [guide.name]), () => {
            DBMS.removeGuide({ name: guide.name }).then(() => {
                exports.refresh();
            }).catch(UI.handleError);
        });
    });

    //Показать предупреждение, если нет полей
    U.hideEl(U.qee(panel, '.alert') , guide.scheme.length !== 0);
    //Показать таблицу, если поля всё-же есть
    U.hideEl(U.qee(panel, '.table') , guide.scheme.length == 0);
    
    const arr = guide.scheme.map(R.compose(CU.strFormat(L10n.getValue('common-set-item-before')), R.append(R.__, []), R.prop('name')));
    arr.push(L10n.getValue('common-set-item-as-last'));





    //Вставляем тексты
    L10n.localizeStatic(panel);
    return U.addEl(rootDiv, panel);
}

function createGuide(dialog) {
    return () => {
        const input = U.qee(dialog, '.entity-input');
        const value = input.value.trim();

       DBMS.createGuide({ name: value }).then(() => {
            input.value = '';
            dialog.hideDlg();
            exports.refresh();
        }).catch((err) => UI.setError(dialog, err));
    };
}
function renameGuide(dialog) {
    return () => {
        const toInput = U.qee(dialog, '.entity-input');
        const { fromName } = dialog;
        const toName = toInput.value.trim();

        DBMS.renameGuide({fromName,toName}).then(() => {
            toInput.value = '';
            dialog.hideDlg();
            exports.refresh();
        }).catch((err) => UI.setError(dialog, err));
    };
}

function createProfileItem(dialog) {
    return () => {
        const input = U.qee(dialog, '.create-entity-name-input');
        const name = input.value.trim();
        const itemType = U.qee(dialog, '.create-entity-type-select').value.trim();
        const { selectedIndex } = U.qee(dialog, '.create-entity-position-select');

        DBMS.createDictionaryItem({
            type: 'dictionary', name, itemType, selectedIndex
        }).then(() => {
            input.value = '';
            dialog.hideDlg();
            exports.refresh();
        }).catch(err => UI.setError(dialog, err));
    };
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
