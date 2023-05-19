/*
Autor: Terran
*/

/**Корневой узел старинцы */
const root = '.dictionary-settings-tab ';
/**Текущий выбранный словарь, у которого создаём поля */
let selectDictonagy = undefined;

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

/**Фильтр названий типов полей словаря. Типа карты со всеми типами и русскими названиями */
var fillItemTypesSel = sel => U.fillSelector(sel, UI.constArr2Select(R.keys(Constants.profileFieldTypes)));

/**Создаём описание словаря. Один словарь - одно описание! */
function makeDictionary(guide) {
    const rootDiv = U.makeEl('div');
    //Диалог переименовния словаря
    const renameGuideDialog = UI.createModalDialog(
        root,
        renameGuide, {
        bodySelector: 'modal-prompt-body',
        dialogTitle: `dictionary-rename_title`,
        actionButtonTitle: 'common-rename',
    });
    U.qee(renameGuideDialog, '.entity-input').value = renameGuideDialog.fromName = guide.name;

    //Диалог добавления полей
    const createProfileItemDialog = UI.createModalDialog(
        root,
        createGuideItem,
        {
            bodySelector: 'create-guide-item-body',
            dialogTitle: 'dictionary-item_field_create',
            actionButtonTitle: 'common-create',
            initBody: (body) => {
                //Заполняем позиции полей
                const arr = guide.scheme.map(R.compose(CU.strFormat(L10n.getValue('common-set-item-before')), R.append(R.__, []), R.prop('name')));
                arr.push(L10n.getValue('common-set-item-as-last'));
                let fillPosTypesSel = sel => U.fillSelector(sel, U.arr2Select(arr));
                let sel = U.clearEl(U.qee(body, '.create-entity-position-select'));
                let fillMainSel = () => { fillPosTypesSel(U.clearEl(sel)); };
                fillMainSel();
                L10n.onL10nChange(fillMainSel);
                //А теперь делаем так, чтобы селект всегда был на конец
                sel['selectedIndex'] = arr.length - 1;

                //Заполняем типы полей
                sel = U.clearEl(U.qee(body, '.create-entity-type-select'));
                fillMainSel = () => { fillItemTypesSel(U.clearEl(sel)); };
                fillMainSel();
                L10n.onL10nChange(fillMainSel);
            }
        }
    );


    //Рабочая панель
    let panel = U.qmte(`${root}.tablePanel-tmpl`);

    //Создаём слушателей на кнопки для словаря в целом
    U.listen(U.qee(panel, '.create'), 'click', () => { selectDictonagy = guide; createProfileItemDialog.showDlg(); });
    U.listen(U.qee(panel, '.rename'), 'click', () => renameGuideDialog.showDlg());
    U.listen(U.qee(panel, '.remove'), 'click', () => {
        UI.confirm(CU.strFormat(L10n.getValue('dictionary-remove_text'), [guide.name]), () => {
            DBMS.removeGuide({ name: guide.name }).then(() => {
                exports.refresh();
            }).catch(UI.handleError);
        });
    });

    //Показать предупреждение, если нет полей
    U.hideEl(U.qee(panel, '.alert'), guide.scheme.length !== 0);
    //Показать таблицу, если поля всё-же есть
    U.hideEl(U.qee(panel, '.table'), guide.scheme.length == 0);

    const table = U.qee(panel, '.dictionary_field_table_item_config_container');

    try {
        U.addEls(table, guide.scheme.map(getInput(guide)));
    } catch (err1) {
        UI.handleError(err1); return;
    }

    //Вставляем тексты
    L10n.localizeStatic(panel);
    return U.addEl(rootDiv, panel);
}

/**
 * Преобразование пеерчисления в набор элементов.
 * @param {Array<string>} list список значений 
 * @param {string} defaultValue значение по умлочанию (выдеделяется)
 * @returns 
 */
function enumList2Els(list, defaultValue) {
    return R.splitEvery(4, list.map((val) => {
        const span = U.addEl(U.makeEl('span'), U.makeText(val));
        if (defaultValue !== undefined && val === defaultValue) {
            U.addClass(span, 'bold');
            U.setAttr(span, 'title', L10n.getValue('profiles-default-value'));
        }
        U.addClass(span, 'margin-right-16 enum-item');
        return span;
    })).map(arr => U.addEls(U.makeEl('div'), arr));
}

/**
 * Сменить тип поля справочника
 * @return функция, которая
 */
function changeDictonaryItemType(event, guide) {
    UI.confirm(CU.strFormat(L10n.getValue('dictionary-are_you_sure_changing_item_type'), [event.target.info]), () => {
        const newType = event.target.value;
        const name = event.target.info;
        DBMS.changeDictonaryItemType({ guideName: guide.name, itemName: name, newType }).then(exports.refresh, UI.handleError);
    }, () => { event.target.value = event.target.oldType; });
}
/**
 * Преобразовывает схему гайда в набор элементов строк таблицы
 */
var getInput = R.curry((guide, settingsItem, index) => { // throws InternalError
    const state = {};

    const row = U.qmte(`${root}.tablePanel-row-tmpl`);
    L10n.localizeStatic(row);
    U.addEl(U.qee(row, '.item-position'), U.makeText(index + 1));
    U.addEl(U.qee(row, '.item-name'), U.makeText(settingsItem.name));

    const itemType = U.qee(row, '.item-type');
    fillItemTypesSel(itemType);
    //Тип поля
    itemType.value = settingsItem.type;
    //Название
    itemType.info = settingsItem.name;
    //Переменная памяти
    itemType.oldType = settingsItem.type;
    //Сменили тип
    U.listen(itemType, 'change', event => changeDictonaryItemType(event, guide));

    let input, addDefaultListener = true, list, defaultValue, list2;
    //В зависимости от типа разные текссты
    switch (settingsItem.type) {
        case 'text':
            input = U.makeEl('textarea');
            U.addClass(input, 'hidden');
            input.value = settingsItem.value;
            break;
        case 'enum':
            input = U.qmte(`${root}.enum-value-editor-tmpl`);
            list = settingsItem.value.split(',');
            defaultValue = list[0];
            list.sort(CU.charOrdA);

            U.addEls(U.qee(input, '.text'), enumList2Els(list, defaultValue));

            U.listen(U.qee(input, '.btn.add'), 'click', onGEditEnumValues(settingsItem.name, list, defaultValue, guide));

            U.listen(U.qee(input, '.btn.rename'), 'click', onGRenameEnumValue(list, settingsItem.name, guide));

            L10n.localizeStatic(input);
            addDefaultListener = false;
            break;
        case 'multiEnum':
            input = U.qmte(`${root}.enum-value-editor-tmpl`);
            list2 = settingsItem.value.split(',');
            list2.sort(CU.charOrdA);

            U.addEls(U.qee(input, '.text'), enumList2Els(list2));
            U.listen(U.qee(input, '.btn.add'), 'click', onGEditMultiEnumValue(list2, settingsItem.name, guide));

            U.listen(U.qee(input, '.btn.rename'), 'click', onGRenameEnumValue(list2, settingsItem.name, guide));

            L10n.localizeStatic(input);
            addDefaultListener = false;
            break;
        case 'string':
            input = U.makeEl('input');
            U.addClass(input, 'hidden');
            input.value = settingsItem.value;
            break;
        case 'number':
            input = U.makeEl('input');
            input.type = 'number';
            U.addClass(input, 'hidden');
            input.value = settingsItem.value;
            break;
        case 'checkbox':
            input = U.makeEl('input');
            U.setAttr(input, 'title', L10n.getValue('profiles-default-value'));
            input.type = 'checkbox';
            input.checked = settingsItem.value;
            break;
        default:
            throw new Errors.InternalError('errors-unexpected-switch-argument', [settingsItem.type]);
    }

    U.setProps(input, {
        info: settingsItem.name,
        infoType: settingsItem.type,
        oldValue: settingsItem.value
    });
    //Добавить слушателя для тех объектов, которые могут изменить своё состояние по клику - пока только галочка
    if (addDefaultListener) {
        U.addClasses(input, [`profile-configurer-${settingsItem.type}`, 'adminOnly', 'form-control']);
        U.listen(input, 'change', onGChangeDefaultValue(guide.name));
    }
    U.addEl(U.qee(row, '.item-default-value-container'), input);

    //Печать во вводных
    U.setClassIf(U.qee(row, '.print'), 'btn-primary', settingsItem.doExport);
    U.listen(U.qee(row, '.print'), 'click', (e) => {
        DBMS.doExportGuideItemChange(
            { guideName: guide.name, itemName: settingsItem.name, checked: !U.hasClass(e.target, 'btn-primary') }
        ).then(() => {
            U.toggleClass(e.target, 'btn-primary');
        }).catch(UI.handleError);
    });

    //Изменить позицию
    U.listen(U.qee(row, '.move'), 'click', onGClickMoveItem(guide, index));
    //Переименовать
    U.listen(U.qee(row, '.rename-profile-item'), 'click', onGClickRename(guide, settingsItem.name));
    //Удалить
    U.listen(U.qee(row, '.remove'), 'click', () => {
        UI.confirm(L10n.format('dictionary', 'are_you__removing_item', [settingsItem.name, guide.name]), () => {
            DBMS.removeGuideItem({ guideName:guide.name ,index, itemName: settingsItem.name }).then(exports.refresh, UI.handleError);
        });
    });

    return row;
});


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

        DBMS.renameGuide({ fromName, toName }).then(() => {
            toInput.value = '';
            dialog.hideDlg();
            exports.refresh();
        }).catch((err) => UI.setError(dialog, err));
    };
}
/**
 * Генератор функции, которая сработает, когда нужно будет создать новый элемент словаря
 * @param {*} dialog 
 * @returns 
 */
function createGuideItem(dialog) {
    return () => {
        const input = U.qee(dialog, '.create-entity-name-input');
        const nameField = input.value.trim();
        const itemType = U.qee(dialog, '.create-entity-type-select').value.trim();
        const { selectedIndex } = U.qee(dialog, '.create-entity-position-select');

        DBMS.createDictionaryItem({ nameDictionary: selectDictonagy.name, nameField, itemType, selectedIndex }).then(() => {
            input.value = '';
            dialog.hideDlg();
            exports.refresh();
        }).catch(err => UI.setError(dialog, err));
    };
}

/**Событие обновления перечислений в типах поля единственный и множественный выбор
 * @param {*} dialog 
 * @returns 
 */
function updateEnumValues(dialog) {
    return () => {
        const name = dialog.itemName;
        const inputArea = U.qee(dialog, '.enum-value-input');
        const defaultValueSelect = U.qee(dialog, '.default-value-select');

        if (inputArea.value.trim() === '') {
            UI.alert(L10n.getValue('profiles-enum-item-cant-be-empty'));
            return;
        }
        let newVals = inputArea.value.split(',').map(R.trim).filter(R.pipe(R.equals(''), R.not));
        if (defaultValueSelect) {
            const defaultValue = defaultValueSelect.value;
            newVals = R.without([defaultValue], newVals);
            newVals = R.prepend(defaultValue, newVals);
        }

        DBMS.updateGuideDefaultValue(
            { guideName: selectDictonagy.name, itemName: name, value: newVals.join(',') }
        ).then(() => {
            dialog.hideDlg();
            exports.refresh();
        }, err => UI.setError(dialog, err));
    };
}
/**Генератор реакции на Событие нажатия на кнопочку изменения перечисления */
function onGEditEnumValues(fieldName, list, defaultValue, guide) {
    return () => {
        selectDictonagy = guide;
        let enumEditorDialog = UI.createModalDialog(
            root,
            updateEnumValues, {
            bodySelector: 'enum-dialog-editor-tmpl',
            dialogTitle: 'profiles-enum-editor',
            actionButtonTitle: 'common-save',
            initBody: (body) => {
                const addedValuesArea = U.qee(body, '.new-enum-values');
                const removedValuesArea = U.qee(body, '.removed-enum-values');
                const inputArea = U.qee(body, '.enum-value-input');
                const defaultValueSelect = U.qee(body, '.default-value-select');
                U.listen(inputArea, 'input', () => {
                    const newVals = inputArea.value.split(',').map(R.trim).filter(R.pipe(R.equals(''), R.not));
                    const addedValues = R.sort(CU.charOrdA, R.difference(newVals, inputArea.srcList));
                    U.addEls(U.clearEl(addedValuesArea), enumList2Els(addedValues));
                    const removedValues = R.sort(CU.charOrdA, R.difference(inputArea.srcList, newVals));
                    U.addEls(U.clearEl(removedValuesArea), enumList2Els(removedValues));

                    let defaultValue = defaultValueSelect.value;
                    U.clearEl(defaultValueSelect);

                    if (newVals.length === 0) {
                        return;
                    }

                    if (!R.contains(defaultValue, newVals)) {
                        defaultValue = newVals[0];
                    }
                    U.fillSelector(defaultValueSelect, U.arr2Select(newVals));
                    U.qee(defaultValueSelect, `[value="${defaultValue}"]`).selected = true;
                });
            }
        });


        U.addEls(U.clearEl(U.qee(enumEditorDialog, '.initial-value')), enumList2Els(list, defaultValue));
        const inputArea = U.qee(enumEditorDialog, '.enum-value-input');
        inputArea.value = list.join(',');
        inputArea.srcList = list;
        inputArea.defaultValue = defaultValue;

        const defaultValueSelect = U.clearEl(U.qee(enumEditorDialog, '.default-value-select'));
        U.fillSelector(defaultValueSelect, U.arr2Select(list));
        U.qee(defaultValueSelect, `[value="${defaultValue}"]`).selected = true;
        enumEditorDialog.itemName = fieldName;
        enumEditorDialog.showDlg();
    };
}
/** Генератор функции переименования одного из значений массива
 * @param {Array<string>} list перечисление
 * @param {string} fieldName название поля в целом
 * @returns 
 */
function onGRenameEnumValue(list, fieldName, guide) {
    return () => {
        selectDictonagy = guide;
        let renameEnumItemDialog = UI.createModalDialog(
            root,
            renameEnumValue, {
            bodySelector: 'rename-enum-value-tmpl',
            dialogTitle: 'profiles-rename-enum-item',
            actionButtonTitle: 'common-rename',
            initBody: (body) => {
                const renameSelect = U.clearEl(U.qee(body, '.renamed-value-select'));
                const renameInput = U.clearEl(U.qee(body, '.enum-value-name-input'));
                U.listen(renameSelect, 'change', () => {
                    renameInput.value = renameSelect.value;
                });
            }
        }
        );
        const renameSelect = U.clearEl(U.qee(renameEnumItemDialog, '.renamed-value-select'));
        U.fillSelector(renameSelect, U.arr2Select(list));

        if (list.length > 0) {
            U.qee(renameEnumItemDialog, '.enum-value-name-input').value = list[0];
        }

        renameEnumItemDialog.itemName = fieldName;
        renameEnumItemDialog.showDlg();
    };
}
/**Генератор функции на переименование элемента перечисления
 * 
 * @param {*} dialog 
 * @returns 
 */
function renameEnumValue(dialog) {
    return () => {
        const name = dialog.itemName;
        const renameSelect = U.qee(dialog, '.renamed-value-select');
        const renameInput = U.qee(dialog, '.enum-value-name-input');

        DBMS.renameGuideEnumValue(
            { guideName: selectDictonagy.name, itemName: name, fromValue: renameSelect.value.trim(), toValue: renameInput.value.trim() }
        ).then(() => {
            dialog.hideDlg();
            exports.refresh();
        }, err => UI.setError(dialog, err));
    };
}

/**Генератор функции для переименования множественного выбора
 * @param {Array<string>} list2 перечисление
 * @param {string} fieldName название поля в целом
 * @returns 
 */
function onGEditMultiEnumValue(list2, fieldName, guide) {
    return () => {
        selectDictonagy = guide;
        let multiEnumEditorDialog = UI.createModalDialog(
            root,
            updateEnumValues, {
            bodySelector: 'multi-enum-dialog-editor-tmpl',
            dialogTitle: 'profiles-multi-enum-editor',
            actionButtonTitle: 'common-save',
            initBody: (body) => {
                const addedValuesArea = U.qee(body, '.new-enum-values');
                const removedValuesArea = U.qee(body, '.removed-enum-values');
                const inputArea = U.qee(body, '.enum-value-input');
                U.listen(inputArea, 'input', () => {
                    const newVals = inputArea.value.split(',').map(R.trim).filter(R.pipe(R.equals(''), R.not));
                    const addedValues = R.sort(CU.charOrdA, R.difference(newVals, inputArea.srcList));
                    U.addEls(U.clearEl(addedValuesArea), enumList2Els(addedValues));
                    const removedValues = R.sort(CU.charOrdA, R.difference(inputArea.srcList, newVals));
                    U.addEls(U.clearEl(removedValuesArea), enumList2Els(removedValues));
                });
            }
        }
        );
        U.addEls(U.clearEl(U.qee(multiEnumEditorDialog, '.initial-value')), enumList2Els(list2));
        const inputArea = U.qee(multiEnumEditorDialog, '.enum-value-input');
        inputArea.value = list2.join(',');
        inputArea.srcList = list2;
        multiEnumEditorDialog.itemName = fieldName;
        multiEnumEditorDialog.showDlg();
    };
}

/** Генератор функции для ситуации когда Изменилось значение по умолчанию для какой-то строки
 * @param {string} guideName имя словаря в котором произошли изменения
 * @returns 
 */
function onGChangeDefaultValue(guideName) {
    return (event) => {
        const name = event.target.info;
        const itemType = event.target.infoType;
        const { oldValue } = event.target;

        const value = itemType === 'checkbox' ? event.target.checked : event.target.value;

        let newValue;

        switch (itemType) {
            case 'text':
            case 'string':
            case 'checkbox':
                DBMS.updateGuideDefaultValue({ guideName: guideName, itemName: name, value: value }).catch(UI.handleError);
                break;
            case 'number':
                if (Number.isNaN(value)) {
                    UI.alert(L10n.getValue('profiles-not-a-number'));
                    event.target.value = oldValue;
                    return;
                }
                DBMS.updateGuideDefaultValue({ guideName: guideName, itemName: name, value: Number(value) }).catch(UI.handleError);
                break;
            case 'multiEnum':
            case 'enum':
                if (value === '' && itemType === 'enum') {
                    UI.alert(L10n.getValue('profiles-enum-item-cant-be-empty'));
                    event.target.value = oldValue;
                    return;
                }
                let newOptions = value.split(',').map(R.trim);
                let missedValues = oldValue.trim() === '' ? [] : R.difference(oldValue.split(','), newOptions);

                let updateEnum = () => {
                    newValue = newOptions.join(',');
                    event.target.value = newValue;
                    event.target.oldValue = newValue;

                    DBMS.updateGuideDefaultValue({ guideName: guideName, itemName: name, value: newValue }).catch(UI.handleError);
                };

                if (missedValues.length !== 0) {
                    UI.confirm(CU.strFormat(L10n.getValue('profiles-new-enum-values-remove-some-old-values'), [missedValues.join(',')]), updateEnum, () => {
                        event.target.value = oldValue;
                    });
                } else {
                    updateEnum();
                }
                break;
            default:
                UI.handleError(new Errors.InternalError('errors-unexpected-switch-argument', [itemType]));
        }
    };
}
/**Генератор функции по нажатию кнопки смены положения элемента в словаре
 * 
 * @param {object} guide справочник, в котором изменяем положение
 * @param {number} index текущее положение в справочнике
 * @returns 
 */
function onGClickMoveItem(guide, index) {
    return () => {
        selectDictonagy = guide;
        let moveItemDialog = UI.createModalDialog(
            root,
            moveGuideItem, {
            bodySelector: 'move-profile-item-body',
            dialogTitle: 'dictionary-new_item_position',
            actionButtonTitle: 'common-move',
            initBody: (body) => {
                //Заполняем позиции полей
                const arr = guide.scheme.map(R.compose(CU.strFormat(L10n.getValue('common-set-item-before')), R.append(R.__, []), R.prop('name')));
                arr.push(L10n.getValue('common-set-item-as-last'));
                let fillPosTypesSel = sel => U.fillSelector(sel, U.arr2Select(arr));
                let sel = U.clearEl(U.qee(body, '.move-entity-position-select'));
                let fillMainSel = () => { fillPosTypesSel(U.clearEl(sel)); };
                fillMainSel();
                L10n.onL10nChange(fillMainSel);
                //А теперь делаем так, чтобы селект всегда был на конец
                sel['selectedIndex'] = index;
            }
        }
        );
        moveItemDialog.tmpCurrentIndex = index;
        moveItemDialog.showDlg();
    };
}

/**Генератор функции которая Сдвигает положение элемента в списке
 * 
 * @param {*} dialog 
 * @returns 
 */
function moveGuideItem(dialog) {
    return () => {
        const index = dialog.tmpCurrentIndex;
        const { selectedIndex } = U.qee(dialog, '.move-entity-position-select');
        DBMS.moveGuideItem(
            { guideName: selectDictonagy.name, index, newIndex: selectedIndex }
        ).then(() => {
            dialog.hideDlg();
            exports.refresh();
        }, err => UI.setError(dialog, err));
    };
}
/**Переименовывает элемент в спловаре
 * 
 * @param {*} dialog 
 * @returns 
 */
function renameItem(dialog) {
    return () => {
        const toInput = U.qee(dialog, '.entity-input');
        const oldName = dialog.fromName;
        const newName = toInput.value.trim();

        DBMS.renameGuideItem(
            { guideName: dialog.guideName, newName, oldName }
        ).then(() => {
            toInput.value = '';
            dialog.hideDlg();
            exports.refresh();
        }).catch(err => UI.setError(dialog, err));
    };
}
/**Генератор функции переименования поля в справочнике
 * @param {*} guide справочник
 * @param {*} fieldName название поля
 * @returns 
 */
function onGClickRename(guide, fieldName) {
    return () => {
        selectDictonagy = guide;
        let renameItemDialog = UI.createModalDialog(
            root,
            renameItem, {
            bodySelector: 'modal-prompt-body',
            dialogTitle: 'profiles-enter-new-profile-item-name',
            actionButtonTitle: 'common-rename',
        }
        );
        U.qee(renameItemDialog, '.entity-input').value = fieldName;
        renameItemDialog.fromName = fieldName;
        renameItemDialog.guideName = guide.name;
        renameItemDialog.showDlg();
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
