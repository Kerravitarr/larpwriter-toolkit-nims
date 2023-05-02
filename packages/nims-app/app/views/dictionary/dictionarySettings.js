/*
Autor: Terran
*/

/**Корневой узел старинцы */
const root = '.dictionary-settings-tab ';
/**Справочники в системе */
let guides = [
    //name - название справочника
    //fields - поля справочника
    /*{
         name: 'Босы',
         fields: [],
     }*/
];

exports.init = () => {
    exports.content = U.queryEl(root);
};


exports.refresh = () => {
    U.clearEl(U.queryEl('#dictionarys'));

    const content = U.clearEl(U.queryEl('#dictionarys'));
    let index = 0;
    function buildContentInner() {
        if (index < guides.length) {
            index++;
            buildContentInner();
        } else {
            guides.forEach((guide) => {
                U.addEl(content, makePanel(U.makeText(guide.name), makeDictionary(guide),
                ));
            });
        }
    }
    buildContentInner();
    /*
    Promise.all([
        DBMS.getDictionaryStructure({})
    ]).then((results) => {
        const [allProfileSettings] = results;
        U.hideEl(U.queryEl(`${root} .alert`), allProfileSettings.length !== 0);
        U.hideEl(U.queryEl(`${root} table`), allProfileSettings.length === 0);

        const arr = allProfileSettings.map(R.compose(CU.strFormat(L10n.getValue('common-set-item-before')), R.append(R.__, []), R.prop('name')));
        arr.push(L10n.getValue('common-set-item-as-last'));

        const positionSelectors = [U.queryEl(`${root} .create-entity-position-select`),
            U.queryEl(`${root} .move-entity-position-select`)];
        positionSelectors.map(U.clearEl).map(U.fillSelector(R.__, U.arr2Select(arr))).map(U.setProp(R.__, 'selectedIndex', allProfileSettings.length));

        const table = U.clearEl(U.queryEl(`${root}.profile-config-container`));

        try {
            U.addEls(table, allProfileSettings.map(getInput(type)));
        } catch (err1) {
            UI.handleError(err1); return;
        }
        UI.enable(exports.content, 'adminOnly', true);
    }).catch(UI.handleError);
    */
};


var fillItemTypesSel = sel => U.fillSelector(sel, UI.constArr2Select(R.keys(Constants.profileFieldTypes)));
/**Создаём описание словаря */
function makeDictionary(guide) {
    const rootDiv = U.makeEl('div');
    if(guide.fields == undefined || guide.fields.length == 0){
        //Диалог добавления полей
        const createProfileItemDialog = UI.createModalDialog(
            `${root}`,
            createProfileItem, 
            {
                bodySelector: 'create-guide-item-body',
                dialogTitle: 'dictionary-item_field_create',
                actionButtonTitle: 'common-create',
                initBody: (body) => {
                    const sel = U.clearEl(U.qee(body, '.create-entity-type-select'));
                    const fillMainSel = () => { fillItemTypesSel(U.clearEl(sel)); };
                    fillMainSel();
                    L10n.onL10nChange(fillMainSel);
                }
            }
        );


        //Сообщение об ошибке
        let alert = U.qmte(`${root}.alert-tmpl`);
        //Создаём слушателя на событие "новое поле словаря"
        U.listen(alert, 'click', () => createProfileItemDialog.showDlg());
        //Вставляем тексты
        L10n.localizeStatic(alert);
        return U.addEl(rootDiv, alert);
    } else {

    }



    let input = U.qmte(`${root} .dictionary-header-tmpl`);
    U.addEls(U.qee(input, '.text'));


    const span = U.addEl(U.makeEl('textarea'), U.makeText("С текстом"));
    U.setAttr(span, 'disabled', 'disabled');
    U.addClasses(span, ['briefingTextSpan', 'form-control']);
    return U.addEl(rootDiv, span);
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
