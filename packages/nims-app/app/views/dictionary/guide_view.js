/*
Autor: Terran
*/

/**Корневой узел старинцы */
const root = '.guide-view-tab ';
/**Текущий выбранный словарь, у которого создаём поля */
let selectDictonagy = undefined;
/**Строка, на которую нужно отмотать таблицу. Если -1 или undefended, то отматывет к шапке */
let selectRow = -1;
/**Активные, на текущий момент, фильтры */
let filters = {};

exports.init = () => {
    exports.content = U.queryEl(root);
    //Слушаем событие добавления записей
    U.listen(U.queryEl(`${root} .create`), 'click', () => {selectRow = selectDictonagy.rows.length;newGuideRow(selectDictonagy.rows.length);});
    U.listen(U.queryEl(`${root} .entity-filter`), 'input', filterOptions);
};


exports.refresh = () => {
    const content = U.clearEl(U.queryEl(`${root} .entity-list`));
    Promise.all([
        DBMS.getGuides({})
    ]).then((results) => {
        const [guides] = results;
        const allGuides = Object.entries(guides);
        //Сортируем словари по имени
        allGuides.sort(([p1, a], [p2, b]) => a.name.localeCompare(b.name));

        //Показать предупреждение, если нет справочников
        U.hideEl(U.queryEl(`${root} .alert-no-guides`), allGuides.length !== 0);
        U.hideEl(U.queryEl(`${root} .guide-panel`), allGuides.length === 0);
        //Разершить поиск, если справочники есть
        UI.enableEl(U.queryEl(`${root}.entity-filter`), allGuides.length > 0);

        for (let index = 0; index < allGuides.length; index++) {
            const [nameGuide, guide] = allGuides[index];
            const el = U.wrapEl('div', U.qte(`${root} .entity-item-tmpl`));
            U.addEl(U.qee(el, '.primary-name'), U.makeText(nameGuide));
            U.setAttr(el, 'primary-name', nameGuide);
            //Свойство по которому будем выделять словари
            U.setAttr(el, 'guide-name', nameGuide);
            U.listen(U.qee(el, '.select-button'), 'click', () => { selectRow =  undefined; selectGuide(guide.name); });
            U.setAttr(U.qee(el, '.rename'), 'title', L10n.getValue('dictionary-item_field_rename'));
            const removeBtn = U.qee(el, '.remove');
            U.setAttr(removeBtn, 'title', L10n.getValue('dictionary-item_field_remove'));

            U.listen(U.qee(el, '.rename'), 'click', () => {
                //Диалог переименовния словаря
                const renameGuideDialog = UI.createModalDialog(
                    root,
                    renameGuide, {
                    bodySelector: 'modal-prompt-body',
                    dialogTitle: `dictionary-rename_title`,
                    actionButtonTitle: 'common-rename',
                });
                U.qee(renameGuideDialog, '.entity-input').value = renameGuideDialog.fromName = guide.name;
                renameGuideDialog.showDlg();
            });
            U.listen(removeBtn, 'click', () => {
                UI.confirm(CU.strFormat(L10n.getValue('dictionary-remove_text'), [guide.name]), () => {
                    DBMS.removeGuide({ name: guide.name }).then(() => {
                        if (selectDictonagy != undefined && selectDictonagy.name === guide.name) {
                            selectDictonagy = undefined;
                            exports.refresh();
                            if (allGuides.length > 1) {
                                if (index == 0) {
                                    const [lastName, lastGuide] = allGuides[allGuides.length - 1];
                                    selectGuide(lastName);
                                } else {
                                    const [prefName, prefGuide] = allGuides[index - 1];
                                    selectGuide(prefName);
                                }
                            } else {
                                selectGuide(null);
                            }
                        } else {
                            exports.refresh();
                        }
                    }).catch(UI.handleError);
                });
            });
            U.addEl(content, el);
        }
        //Проверяем, существует-ли такой словарь. Нужно при загрузке новой БД, набело
        if (selectDictonagy != undefined && allGuides.find(([nameGuide, guide]) => selectDictonagy.name == nameGuide) == undefined)
            selectDictonagy = undefined;
        if (selectDictonagy != undefined) {
            selectGuide(selectDictonagy.name);
        } else if (allGuides.length > 0) {
            selectGuide(allGuides[0][0]);
        } else {
            U.hideEl(U.queryEl(`${root} .guide-panel`), true);
        }
    }).catch(UI.handleError);
};
/**Выбрали словарь.
 * 
 * @param {*} guideName название словаря, который надо отобразить 
 */
function selectGuide(guideName) {
    //Скрываем панель, если справочника не будет
    U.hideEl(U.queryEl(`${root} .guide-panel`), guideName === null);
    U.hideEl(U.queryEl(`${root} .guide-filter-panel`), guideName === null);
    U.hideEl(U.queryEl(`${root} .alert-no-items`), guideName !== null);
    U.hideEl(U.queryEl(`${root} .alert-no-guides`), guideName !== null);
    //Очищаем все выделения старые
    U.queryEls(`${root} [guide-name] .select-button`).map(U.removeClass(R.__, 'btn-primary'));
    filters = {};
    if (guideName === null) {
        //Очищаем таблицу от старых записей
        U.clearEl(U.queryEl('#guideRow'));
        return;
    }



    Promise.all([DBMS.getGuide({ guideName: guideName })]).then((results) => {
        const [guide] = results;
        selectDictonagy = guide;
        U.hideEl(U.queryEl(`${root} .guide-filter-panel`), guide.rows.length === 0);
        if(guide.rows.length != 0 && !U.hasClass(U.queryEl(`${root} .guide-filter-panel div.panel-body`), 'hidden'))
            U.queryEl(`${root} .guide-filter-panel h3.panel-title`).click();
        U.hideEl(U.queryEl(`${root} .alert-no-items`), guide.rows.length != 0);
        //Показать предупреждение, если нет записей
        //Выделяем по новой
        const el = U.queryEl(`${root} [guide-name="${guide.name}"] .select-button`);
        U.addClass(el, 'btn-primary');

        const parentEl = el.parentElement.parentElement;
        const entityList = U.queryEl(`${root} .entity-list`);
        UI.scrollTo(entityList, parentEl);

        //Очищаем таблицу от старых записей
        const table = U.clearEl(U.queryEl('#guideRow'));
        U.showEl(table, guide.rows.length !== 0);
        //А теперь попробуем позаполнять табличку
        const tableRows = guide.rows.map(row => appendRowToTable(guide, guide.scheme, row));
        R.ap([U.addEl(table)], tableRows);

        //Очищаем таблицу фильтра от старых записей
        const tableFilters = U.clearEl(U.queryEl('#guideFilters'));
        U.showEl(tableFilters, guide.scheme.length !== 0);
        //А теперь попробуем позаполнять табличку
        const tableFilterRows = guide.scheme.map(row => appendRowFilterToTable(guide, row));
        R.ap([U.addEl(tableFilters)], tableFilterRows);

        //Отматываем на нужную строку справочника
        if(selectRow == undefined || selectRow < 0 || tableRows.length == 0)
            U.queryEl(`${root} .create`).scrollIntoView();
        else
            tableRows[Math.min(selectRow,tableRows.length - 1)].scrollIntoView();

    }).catch(UI.handleError);
}
/**Создаёт новую строку в справочнике
 * 
 * @param {*} guide справочник, строка которого создаётся
 */
function newGuideRow(index) {
    DBMS.createGuideRow({ guideName: selectDictonagy.name, index: index }).then(() => {
        selectGuide(selectDictonagy.name);
    }).catch((err) => UI.setError(dialog, err));
}
/**Сооружает строку таблицы и возвращает её
 * 
 * @param {*} guide гайд, чья строка
 * @param {*} scheme схема по которой раскрывается строка
 * @param {*} row строка, которую мы хотим отобразить
 * @returns 
 */
function appendRowToTable(guide, scheme, row) {
    const index = guide.rows.indexOf(row);
    //Создаём нашу строку
    const el = U.wrapEl('tr', U.qte(`${root} .guide-row-tmpl`));
    U.setAttr( U.qee(el, '.panel-body'), 'index',index);
    //И русифицируем её
    L10n.localizeStatic(el);
    const panel = U.qee(el, '.guide-div');
    let isHasTextArea = false;
    //А теперь для каждого элемента строки
    scheme.forEach(obj => {
        let input, sel, toNameObj, multiEnumSelect;
        switch (obj.type) {
            case 'text':
                isHasTextArea = true;
                input = U.makeEl('textarea');
                let timerId = undefined;
                function outputsize() {
                    //Пока высота у нас неопределена - ну и фиг с ней
                    if (input.style.height == undefined || input.style.height === "" || input.offsetHeight == 0) {
                        if (row[obj.name].height > 0)
                            input.style.height = (row[obj.name].height) + "px";
                        return;
                    }
                    if (timerId != undefined) {
                        clearTimeout(timerId);
                    }
                    timerId = setTimeout(() => {
                        if(input.offsetHeight != 0) //Если input уже исчез с экрана, то тут будет 0. А нам это не надо!
                            onGChangeFieldValue(guide.name, index, undefined, obj.type, input, obj.name, undefined)(undefined);
                        timerId = undefined;
                    }, 250);
                }
                new ResizeObserver(outputsize).observe(input);
                U.addClass(input, 'profileTextInput');
                U.setAttr(input, 'style', 'resize: vertical;');
                //Сбрасывает высоту арии таким образом, чтобы она стала аккурат под размер содержимого
                U.listen(U.qee(el, '.resize'), 'click', () => {
                    //Очищаем строку, чтобы она меньше места занимала
                    input.value = input.value.trim();
                    input.style.height = 'auto';
                    input.style.height = (input.scrollHeight + 5) + 'px';
                    onGChangeFieldValue(guide.name, index, undefined, obj.type, input, obj.name, input.scrollHeight)(undefined);
                });
                //Сбрасывает высоту арии таким образом, чтобы она стала аккурат под размер содержимого
                U.listen(U.qee(el, '.compress'), 'click', () => {
                    onGChangeFieldValue(guide.name, index, undefined, obj.type, input, obj.name, -1)(undefined);
                    selectGuide(guide.name);
                });
                break;
            case 'string':
                input = U.makeEl('input');
                U.addClass(input, 'profileStringInput');
                break;
            case 'enum':
                input = U.makeEl('select');
                U.addClass(input, 'profileSelectInput');
                toNameObj = R.compose(R.zipObj(['name']), R.append(R.__, []));
                U.fillSelector(input, R.sort(CU.charOrdA, obj.value.split(',')).map(toNameObj));
                break;
            case 'number':
                input = U.makeEl('input');
                input.type = 'number';
                break;
            case 'checkbox':
                input = U.makeEl('input');
                input.type = 'checkbox';
                break;
            case 'multiEnum':
                multiEnumSelect = $('<select></select>');
                U.setAttr(multiEnumSelect[0], 'style', 'width: 100%;');
                U.addClass(multiEnumSelect[0], 'common-select');
                U.addClass(multiEnumSelect[0], 'profileStringInput');
                [input] = $('<span></span>').append(multiEnumSelect);
                U.setAttr(multiEnumSelect[0], 'multiple', 'multiple');

                sel = multiEnumSelect.select2(U.arr2Select2(R.sort(CU.charOrdA, obj.value.split(','))));
                sel.on('change', onGChangeFieldValue(guide.name, index, multiEnumSelect, obj.type, multiEnumSelect, obj.name, undefined));
                break;
            default:
                throw new Errors.InternalError('errors-unexpected-switch-argument', [obj.type]);
        }
        //Слушатель изменения состояния
        if (obj.type !== 'multiEnum') {
            U.listen(input, 'change', onGChangeFieldValue(guide.name, index, undefined, obj.type, input, obj.name, undefined));
            U.addClass(input, 'form-control');
        }
        if (obj.type === 'checkbox') {
            input.checked = row[obj.name];
        } else if (obj.type === 'multiEnum') {
            multiEnumSelect.val(row[obj.name] === '' ? null : row[obj.name].split(',')).trigger('change');
        } else if (obj.type === 'text') {
            input.value = row[obj.name].text;
        } else {
            input.value = row[obj.name];
        }
        //А теперь добавляем элемент на панель
        if (obj.type === 'text') {
            let label = U.makeEl('label');
            U.addClass(label, 'col-xs-11 control-label');
            U.addEl(label, U.makeText(obj.name + ': '));
            U.addEl(panel, label);
            U.addEl(panel, input);
        } else {
            let grupe = U.makeEl('div');
            U.addClass(grupe, 'form-group');
            let label = U.makeEl('label');
            U.addClass(label, 'col-xs-1 control-label');
            U.addEl(label, U.makeText(obj.name + ': '));
            U.addEl(grupe, label);
            let divInput = U.makeEl('div');
            U.addClass(divInput, 'col-xs-11 form-control-static');
            U.addEl(divInput, input);
            U.addEl(grupe, divInput);
            U.addEl(panel, grupe);
        }
    });
    //Отображем кнопку только тогда, когда есть текстовые поля
    U.hideEl(U.qee(el, '.resize'), !isHasTextArea);
    //А теперь события!
    U.listen(U.qee(el, '.create'), 'click', () => {selectRow = index + 1; newGuideRow(index + 1);});
    U.listen(U.qee(el, '.remove'), 'click', () => {
        UI.confirm(L10n.getValue('dictionary-dialog_remove_item'), () => {
            DBMS.removeGuideRow({ guideName: selectDictonagy.name, index: index }).then(() => { selectRow = index - 1;selectGuide(guide.name); }).catch((err) => UI.setError(dialog, err));
        });
    });
    return el;
}
/**Сооружает строку таблицы фильтров и возвращает её
 * 
 * @param {*} guide гайд, чья строка
 * @param {*} filter тип поля для фильтрации
 * @returns панельска строки
 */
function appendRowFilterToTable(guide, filter) {
    //Создаём нашу строку
    const el = U.wrapEl('tr', U.qte(`${root} .entity-filter-item-tmpl`));
    //И русифицируем её
    L10n.localizeStatic(el);

    let input = undefined, sel, toNameObj;
    switch (filter.type) {
        case 'text':
        case 'string':
            input = U.makeEl('input');
            U.setAttr(input, 'style', 'width: 100%;');
            U.listen(input, 'input', (event) => {
                const value = input.value.toLowerCase();
                if(value == "") filters[filter.name] = undefined;
                else filters[filter.name] = {type: filter.type, value: value};
                onGChangeFilterValue(guide.rows, filters);
            });
            break;
        case 'enum':
        case 'multiEnum':
            let multiEnumSelect = $('<select></select>');
            U.setAttr(multiEnumSelect[0], 'style', 'width: 100%;');
            U.addClass(multiEnumSelect[0], 'common-select');
            U.addClass(multiEnumSelect[0], 'profileStringInput');
            [input] = $('<span></span>').append(multiEnumSelect);
            U.setAttr(multiEnumSelect[0], 'multiple', 'multiple');

            sel = multiEnumSelect.select2(U.arr2Select2(R.sort(CU.charOrdA, filter.value.split(','))));
            sel.on('change', (event) => {
                const values = multiEnumSelect.val();
                if(values.length == 0) filters[filter.name] = undefined;
                else filters[filter.name] = {type: filter.type, value: values};
                onGChangeFilterValue(guide.rows, filters);
            });
            break;
       /* case 'number':
            input = U.makeEl('input');
            input.type = 'number';
            break;
        case 'checkbox':
            input = U.makeEl('input');
            input.type = 'checkbox';
            break;
        case 'enum':
        case 'multiEnum':
            multiEnumSelect = $('<select></select>');
            U.setAttr(multiEnumSelect[0], 'style', 'width: 100%;');
            U.addClass(multiEnumSelect[0], 'common-select');
            U.addClass(multiEnumSelect[0], 'profileStringInput');
            [input] = $('<span></span>').append(multiEnumSelect);
            U.setAttr(multiEnumSelect[0], 'multiple', 'multiple');

            sel = multiEnumSelect.select2(U.arr2Select2(R.sort(CU.charOrdA, filter.value.split(','))));
            sel.on('change', onGChangeFilterValue(filter.type, multiEnumSelect, filter.name, guide.rows));
            break;*/
        default:
            //throw new Errors.InternalError('errors-unexpected-switch-argument', [filter.type]);
    }
    //Слушатель изменения состояния
   /* if (filter.type !== 'multiEnum') {
        U.listen(input, 'change', onGChangeFilterValue(filter.type,input, filter.name, guide.rows));
        U.addClass(input, 'form-control');
    }*/
    //А теперь добавляем стрку на панель
    let grupe = U.makeEl('div');
    U.addClass(grupe, 'form-group');
    let label = U.makeEl('label');
    U.addClass(label, 'col-xs-2 control-label');
    U.addEl(label, U.makeText(filter.name + ': '));
    U.addEl(grupe, label);
    let divInput = U.makeEl('div');
    U.addClass(divInput, 'col-xs-10 form-control-static');
    if(input != undefined)
        U.addEl(divInput, input);
    U.addEl(grupe, divInput);
    U.addEl(el, grupe);

    return el;
}

/**Генератор функции, которая сработает при изменении данных в поле записи
 * 
 * @param {string} guideName имя гайда
 * @param {ineger} index номер строки
 * @param {Node} multiEnumSelect объект многовариантного выбора 
 * @param {string} type тип поля
 * @param {Node} input поле, которое изменилось
 * @param {string} fieldName название поля
 * @param {ineger} newHeightTextArea новое значение высоты строки, только для текстового поля. Если передать undefined, то высчитывается автоматически
 */
function onGChangeFieldValue(guideName, index, multiEnumSelect, type, input, fieldName, newHeightTextArea) {
    return (event) => {
        if (multiEnumSelect && multiEnumSelect.prop('disabled')) {
            return; // we need to trigger change event on multiEnumSelect to update selection.
            // It may be disabled so it has false positive call.
        }

        let value;
        switch (type) {
            case 'text':
                value = { text: input.value, height: newHeightTextArea == undefined ? input.offsetHeight : newHeightTextArea };
                break;
            case 'string':
            case 'enum':
                value = input.value;
                break;
            case 'number':
                if (Number.isNaN(input.value)) {
                    UI.alert(L10n.getValue('profiles-not-a-number'));
                    input.value = 0;
                    return;
                }
                value = Number(input.value);
                break;
            case 'checkbox':
                value = input.checked;
                break;
            case 'multiEnum':
                value = input.val().join(',');
                break;
            default:
                UI.handleError(new Errors.InternalError('errors-unexpected-switch-argument', [type]));
                return;
        }
        DBMS.updateGuideRowField({
            guideName: guideName,
            index: index,
            fieldName: fieldName,
            itemType: type,
            value
        }).catch(UI.processError());
    }
}
/**Функция, которая сработает при изменении данных в поле фильтров
 * @param {Guide.rows} rows все строки гадйда
 * @param {Object} rules активные фильтры
 */
function onGChangeFilterValue(rows, rules){
    const els = U.queryEls(`${root} [guide-row]`);

    els.forEach((el) => {
        const index = U.getAttr(el, 'index');
        if(index >= rows.length) return;
        const row = rows[index];
        let isVisible = true;
        for (var fieldName of Object.keys(rules)) {
            const value = rules[fieldName];
            if(value == undefined) continue;
            switch(value.type){
                case 'text':
                    isVisible &= row[fieldName].text.toLowerCase().indexOf(value.value) >= 0;
                break;
                case 'string':
                    isVisible &= row[fieldName].toLowerCase().indexOf(value.value) >= 0;
                break;
                case 'enum':
                    let isHase = false;
                    for(const v of value.value){
                        if(v === row[fieldName]){
                            isHase = true;
                            break;
                        }
                    }
                    isVisible &= isHase;
                break;
                case 'multiEnum':
                    let isHasm = false;
                    const fieldValues = row[fieldName].split(',');
                    for(const v of value.value){
                        for(const f of fieldValues){
                            if(v === f){
                                isHasm = true;
                                break;
                            }
                        }
                        if(isHasm) break;
                    }
                    isVisible &= isHasm;
                break;
                default:
                    throw new Errors.InternalError('errors-unexpected-switch-argument', [filter.type]);
            };
        };
        U.hideEl(el, !isVisible);
    });
}

/**Генератор функции, которая будет выбрана при нажатии кнопки переименовании словаря
 * 
 * @param {*} dialog 
 * @returns 
 */
function renameGuide(dialog) {
    return () => {
        const toInput = U.qee(dialog, '.entity-input');
        const { fromName } = dialog;
        const toName = toInput.value.trim();

        DBMS.renameGuide({ fromName, toName }).then(() => {
            toInput.value = '';
            dialog.hideDlg();
            if (selectDictonagy.name === fromName) {
                selectDictonagy = undefined;
                exports.refresh();
                selectGuide(toName);
            } else {
                exports.refresh();
            }
        }).catch((err) => UI.setError(dialog, err));
    };
}

function filterOptions(event) {
    const str = event.target.value.toLowerCase();

    const els = U.queryEls(`${root} [primary-name]`);
    els.forEach((el) => {
        let isVisible = U.getAttr(el, 'primary-name').toLowerCase().indexOf(str) !== -1;
        if (!isVisible && U.getAttr(el, 'secondary-name') !== null) {
            isVisible = U.getAttr(el, 'secondary-name').toLowerCase().indexOf(str) !== -1;
        }
        U.hideEl(el, !isVisible);
    });
    if (U.queryEl(`${root} .hidden[primary-name] .select-button.btn-primary`) !== null || U.queryEl(`${root} [primary-name] .select-button.btn-primary`) === null) {
        const els2 = U.queryEls(`${root} [primary-name]`).filter(R.pipe(U.hasClass(R.__, 'hidden'), R.not));
        selectGuide(els2.length > 0 ? U.getAttr(els2[0], 'guide-name') : null);
    } else {
        //            U.queryEl(`${root} [primary-name] .select-button.btn-primary`).scrollIntoView();
    }
}
// })(window.BriefingExport = {});
